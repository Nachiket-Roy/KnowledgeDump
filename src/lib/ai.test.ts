import { describe, it, expect, vi } from 'vitest';
import { extractTags } from './ai';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('AI Tag Extraction', () => {
  it('should robustly parse valid JSON arrays from markdown responses', async () => {
    // Mock the invoke response to simulate Gemini wrapping JSON in markdown
    vi.mocked(invoke).mockResolvedValueOnce('```json\n["React", "TypeScript", "Tauri"]\n```');

    const tags = await extractTags('Some sample content about React and Tauri.');
    
    expect(tags).toEqual(['React', 'TypeScript', 'Tauri']);
    expect(tags.length).toBe(3);
  });

  it('should limit tags to a maximum of 4', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('["A", "B", "C", "D", "E", "F"]');

    const tags = await extractTags('Many tags returned');
    
    expect(tags).toEqual(['A', 'B', 'C', 'D']);
    expect(tags.length).toBe(4);
  });

  it('should return empty array on invalid JSON', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('This is just a sentence, no JSON here.');

    const tags = await extractTags('Invalid JSON response');
    
    expect(tags).toEqual([]);
  });
});
