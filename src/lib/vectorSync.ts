import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';

let worker: Worker | null = null;
let pendingResolvers = new Map<string, { resolve: (vector: number[]) => void, reject: (err: any) => void }>();
let messageIdCounter = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./embeddingWorker.ts', import.meta.url), { type: 'module' });
    
    worker.addEventListener('message', (event) => {
      const { status, id, vector, error } = event.data;
      
      if (status === 'complete' && id !== undefined) {
        const resolver = pendingResolvers.get(id.toString());
        if (resolver) {
          resolver.resolve(vector);
          pendingResolvers.delete(id.toString());
        }
      } else if (status === 'error' && id !== undefined) {
        const resolver = pendingResolvers.get(id.toString());
        if (resolver) {
          resolver.reject(new Error(error));
          pendingResolvers.delete(id.toString());
        }
      }
    });

    // Initialize the model eagerly
    worker.postMessage({ id: 'init' });
  }
  return worker;
}

export async function generateQueryVector(text: string): Promise<number[]> {
  const w = getWorker();
  const id = (++messageIdCounter).toString();
  
  return new Promise((resolve, reject) => {
    pendingResolvers.set(id, { resolve, reject });
    w.postMessage({ id, text });
  });
}

function chunkText(text: string): string[] {
  // Simple chunking by double newlines (paragraphs)
  // Ensure chunks aren't completely empty
  return text.split(/\n\n+/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0);
}

export async function upsertNoteVectors(note: Note): Promise<void> {
  if (!note.content || note.content.trim() === '') {
    // If the note is empty, we still want to store it (or maybe delete old chunks?)
    // For now, we can just return or pass an empty string
    return;
  }

  const chunks = chunkText(note.content);
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      // Create a unique chunk ID combining note ID and index
      const chunkId = `${note.id}-chunk-${i}`;
      // In a more sophisticated app, we'd extract the nearest heading as well.
      // For now, we'll just use the note title as the heading.
      const heading = note.title || 'Untitled';
      
      const vector = await generateQueryVector(chunk);
      
      vectors.push({
        id: chunkId,
        note_id: note.id,
        heading: heading,
        text_snippet: chunk,
        vector: vector
      });
    } catch (e) {
      console.error(`Failed to vectorize chunk ${i} of note ${note.id}`, e);
    }
  }

  if (vectors.length > 0) {
    try {
      await invoke('upsert_vectors', { vectors });
      console.log(`Successfully upserted ${vectors.length} chunks for note ${note.id}`);
    } catch (e) {
      console.error(`Failed to upsert vectors to DB for note ${note.id}`, e);
    }
  }
}
