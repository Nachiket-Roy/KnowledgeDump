import { Note } from '../types';
import { Plus, Search, FileText, Settings as SettingsIcon, Trash2 } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
}

export function Sidebar({ notes, activeNoteId, onSelectNote, onCreateNote, onDeleteNote }: SidebarProps) {
  return (
    <div className="w-64 bg-theme-sidebar border-r border-theme-border flex flex-col h-screen text-gray-200 print:hidden">
      <div className="p-4 flex items-center justify-between border-b border-theme-border">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-theme-accent" />
          KnowledgeDump
        </h1>
        <button onClick={onCreateNote} className="p-1 hover:bg-theme-bg rounded text-gray-400 hover:text-white">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="w-full bg-theme-input text-sm rounded-md py-2 pl-9 pr-3 outline-none focus:ring-1 focus:ring-theme-accent border border-theme-border placeholder-gray-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.map(note => (
          <div 
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={`group px-4 py-3 cursor-pointer border-b border-theme-border/50 hover:bg-theme-bg transition-colors flex items-center justify-between ${activeNoteId === note.id ? 'bg-theme-bg border-l-2 border-l-theme-accent' : 'border-l-2 border-l-transparent'}`}
          >
            <div className="flex-1 min-w-0 mr-2">
              <div className="font-medium text-sm truncate">{note.title || 'Untitled Note'}</div>
              <div className="text-xs text-gray-500 mt-1 truncate">{note.content.substring(0, 50) || 'No content...'}</div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No notes yet. Create one!
          </div>
        )}
      </div>

      <div className="p-4 border-t border-theme-border">
        <button 
          onClick={() => onSelectNote('settings')} 
          className={`flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors w-full p-2 rounded ${activeNoteId === 'settings' ? 'bg-theme-bg text-white' : ''}`}
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
}
