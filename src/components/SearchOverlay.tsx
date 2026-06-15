import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { generateQueryVector } from '../lib/vectorSync';
import { generateAiDescription } from '../lib/ai';

interface SearchResult {
  id: string;
  note_id: string;
  heading: string;
  text_snippet: string;
  distance: number;
  ai_description?: string;
}

export function SearchOverlay({ isOpen, onClose, onSelectNote }: { isOpen: boolean, onClose: () => void, onSelectNote?: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const queryVector = await generateQueryVector(query);
        const searchResults: SearchResult[] = await invoke('vector_search', { queryVector });
        
        setResults(searchResults);
        
        // Fetch AI descriptions asynchronously
        searchResults.forEach((res) => {
          generateAiDescription(query, res.text_snippet).then(desc => {
            setResults(prev => {
              const updated = [...prev];
              const index = updated.findIndex(r => r.id === res.id);
              if (index !== -1) {
                updated[index] = { ...updated[index], ai_description: desc };
              }
              return updated;
            });
          }).catch(console.error);
        });

      } catch (e) {
        console.error("Vector search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-start pt-24 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Search notes"
    >
      <div className="bg-theme-bg w-full max-w-3xl rounded-2xl shadow-2xl border border-theme-border overflow-hidden flex flex-col max-h-[75vh]">
        
        <div className="p-5 border-b border-theme-border flex items-center bg-theme-sidebar/50">
          <input 
            autoFocus
            type="text" 
            aria-label="Search notes"
            placeholder="Search across your notes conceptually..." 
            className="w-full bg-transparent text-2xl font-semibold text-gray-100 outline-none placeholder-gray-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
          <div className="text-xs text-gray-500 bg-theme-input px-2 py-1 rounded-md border border-theme-border">ESC</div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {query.trim() === '' ? (
            <div className="text-center py-16 text-gray-500">
              Try searching for a concept, idea, or a specific term.
            </div>
          ) : isSearching && results.length === 0 ? (
            <div className="text-center py-16 text-gray-500 animate-pulse">
              Generating embeddings and searching database...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No semantic matches found for "{query}".
            </div>
          ) : (
            <div className="space-y-4">
               {results.map(res => (
                 <div 
                   key={res.id} 
                   onClick={() => {
                     if (onSelectNote) onSelectNote(res.note_id);
                     onClose();
                   }}
                   className="bg-theme-sidebar border border-theme-border rounded-xl p-4 hover:border-theme-accent/50 hover:bg-[#2a2a2b] transition-colors cursor-pointer group"
                 >
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="text-theme-accent font-semibold text-lg group-hover:text-theme-accentHover">{res.heading}</h3>
                     <span className="text-xs font-mono bg-green-900/30 text-green-400 px-2 py-1 rounded">
                       {(Math.max(0, 100 - (res.distance * 100))).toFixed(0)}% Match
                     </span>
                   </div>
                   <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                     <span className="bg-theme-input px-2 py-0.5 rounded text-xs text-gray-300">Note: {res.heading}</span>
                   </div>
                   
                   {res.ai_description ? (
                     <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">
                       <span className="text-purple-400 text-xs font-semibold uppercase block mb-1">✨ AI Description</span>
                       {res.ai_description}
                     </p>
                   ) : (
                     <p className="text-gray-400 text-sm italic border-l-2 border-gray-600 pl-3">
                       Generating AI summary...
                     </p>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
