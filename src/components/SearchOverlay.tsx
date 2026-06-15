import { useState } from 'react';

export function SearchOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-start pt-24 transition-opacity duration-300">
      <div className="bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[75vh]">
        
        <div className="p-5 border-b border-gray-700 flex items-center bg-gray-800/50">
          <input 
            autoFocus
            type="text" 
            placeholder="Search across your notes conceptually..." 
            className="w-full bg-transparent text-2xl font-semibold text-gray-100 outline-none placeholder-gray-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
          <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-md border border-gray-700">ESC</div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {query.trim() === '' ? (
            <div className="text-center py-16 text-gray-500">
              Try searching for a concept, idea, or a specific term.
            </div>
          ) : (
            <div className="space-y-4">
               {/* Mock Result Card */}
               <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-750 transition-colors cursor-pointer group">
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="text-blue-400 font-semibold text-lg group-hover:text-blue-300">Understanding React Hooks</h3>
                   <span className="text-xs font-mono bg-green-900/30 text-green-400 px-2 py-1 rounded">98% Match</span>
                 </div>
                 <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                   <span className="bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-300">Note: Frontend Guide</span>
                 </div>
                 <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">
                   <span className="text-purple-400 text-xs font-semibold uppercase block mb-1">✨ AI Description</span>
                   This chunk explains how useEffect is used to synchronize a component with an external system.
                 </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
