import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTags, generateTitle, generateAiDescription, detectLocalProviders } from './ai';

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
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should detect local providers with timeouts', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
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

    fetchSpy.mockRestore();
  });
});
