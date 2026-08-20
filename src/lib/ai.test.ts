import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTags, generateTitle, generateAiDescription, detectLocalProviders, callLocalAi } from './ai';
import { invoke } from '@tauri-apps/api/core';

const mockChat = vi.fn();

vi.mock('ollama/browser', () => {
  return {
    Ollama: class {
      chat = mockChat;
    },
  };
});

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'get_setting') return Promise.resolve(null);
    return Promise.resolve(null);
  }),
}));

describe('Local AI Module', () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
  });

  it('should extract up to 4 tags from Ollama JSON output', async () => {
    mockChat.mockResolvedValueOnce({
      message: { content: '```json\n["React", "TypeScript", "Tauri", "Offline", "Extra"]\n```' },
    });

    const tags = await extractTags('Some content');
    expect(tags).toEqual(['React', 'TypeScript', 'Tauri', 'Offline']);
    expect(tags.length).toBe(4);
  });

  it('should return empty array on invalid JSON tag response', async () => {
    mockChat.mockResolvedValueOnce({
      message: { content: 'Just plain text response' },
    });

    const tags = await extractTags('Some content');
    expect(tags).toEqual([]);
  });

  it('should generate titles using local Ollama', async () => {
    mockChat.mockResolvedValueOnce({
      message: { content: '"Offline Knowledge Base"' },
    });

    const title = await generateTitle('Detailed notes content about local AI tools and notes.');
    expect(title).toBe('Offline Knowledge Base');
  });

  it('should generate section descriptions', async () => {
    mockChat.mockResolvedValueOnce({
      message: { content: 'This section explains local search indexing.' },
    });

    const desc = await generateAiDescription('search index', 'Sample chunk content about search.');
    expect(desc).toBe('This section explains local search indexing.');
  });

  it('should route requests through OpenAI-compatible endpoint when configured', async () => {
    vi.mocked(invoke).mockImplementation((_cmd: string, args?: any) => {
      if (args?.key === 'ai_provider_name') return Promise.resolve('LM Studio');
      if (args?.key === 'ai_provider_host') return Promise.resolve('http://127.0.0.1:1234');
      if (args?.key === 'ai_provider_model') return Promise.resolve('qwen2.5');
      if (args?.key === 'ai_provider_type') return Promise.resolve('openai');
      return Promise.resolve(null);
    });

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options: any) => {
      expect(String(url)).toBe('http://127.0.0.1:1234/v1/chat/completions');
      const body = JSON.parse(options.body);
      expect(body.model).toBe('qwen2.5');
      return Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: 'OpenAI response text' } }]
      }), { status: 200 }));
    });

    const response = await callLocalAi('Test prompt');
    expect(response).toBe('OpenAI response text');
  });

  it('should detect local providers with timeouts', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('11434')) {
        return Promise.resolve(new Response(JSON.stringify({ models: [{ name: 'llama3.2' }] }), { status: 200 }));
      }
      return Promise.reject(new Error('Connection refused'));
    });

    const providers = await detectLocalProviders();
    expect(providers.length).toBeGreaterThan(0);
    const ollama = providers.find(p => p.name === 'Ollama');
    expect(ollama?.status).toBe('online');
    expect(ollama?.models).toEqual(['llama3.2']);
  });
});
