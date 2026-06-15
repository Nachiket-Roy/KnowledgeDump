import lunr from 'lunr';
import { Note } from '../types';

export function buildKeywordIndex(notes: Note[]) {
  return lunr(function () {
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('content');

    notes.forEach((doc) => {
      this.add(doc);
    });
  });
}

export function searchKeywords(index: lunr.Index | null, query: string): { id: string, score: number }[] {
  if (!index || !query.trim()) return [];
  try {
    return index.search(query).map(r => ({
      id: r.ref,
      score: r.score
    }));
  } catch (e) {
    return [];
  }
}
