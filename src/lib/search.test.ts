import { describe, it, expect } from 'vitest';
import { buildKeywordIndex, searchKeywords } from './search';
import { Note } from '../types';

describe('Keyword Search (Lunr)', () => {
  it('should build an index and find notes by title', () => {
    const notes: Note[] = [
      { id: '1', title: 'React Guide', content: 'Learn hooks', created_at: '', updated_at: '' },
      { id: '2', title: 'Rust Guide', content: 'Learn ownership', created_at: '', updated_at: '' }
    ];
    
    const index = buildKeywordIndex(notes);
    const results = searchKeywords(index, 'React');
    
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('1');
  });

  it('should return empty array for empty query', () => {
    const index = buildKeywordIndex([]);
    expect(searchKeywords(index, '  ')).toEqual([]);
  });
});
