import { Note } from '../types';
import { X } from 'lucide-react';

interface TabBarProps {
  openNotes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCloseNote: (id: string, e: React.MouseEvent) => void;
}

export function TabBar({ openNotes, activeNoteId, onSelectNote, onCloseNote }: TabBarProps) {
  if (openNotes.length === 0) return null;

  return (
    <div className="flex bg-theme-sidebar border-b border-theme-border overflow-x-auto overflow-y-hidden h-10 scrollbar-hide">
      {openNotes.map(note => {
        const isActive = note.id === activeNoteId;
        return (
          <div
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={`
              group flex items-center min-w-[120px] max-w-[200px] h-full px-3 border-r border-theme-border cursor-pointer select-none
              transition-colors text-sm
              ${isActive ? 'bg-theme-bg text-white border-t-2 border-t-theme-accent' : 'bg-theme-sidebar text-gray-400 hover:bg-theme-bg/50 border-t-2 border-t-transparent'}
            `}
          >
            <span className="truncate flex-1 font-medium">{note.title || 'New Note'}</span>
            <button
              onClick={(e) => onCloseNote(note.id, e)}
              className={`ml-2 p-0.5 rounded-md hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
