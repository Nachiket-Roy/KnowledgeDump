import { Note } from '../types';
import { Plus, Search, FileText, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
}

export function Sidebar({ notes, activeNoteId, onSelectNote, onCreateNote }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen text-gray-200">
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          KnowledgeDump
        </h1>
        <button onClick={onCreateNote} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="w-full bg-gray-800 text-sm rounded-md py-2 pl-9 pr-3 outline-none focus:ring-1 focus:ring-blue-500 border border-gray-700 placeholder-gray-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.map(note => (
          <div 
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={`px-4 py-3 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${activeNoteId === note.id ? 'bg-gray-800 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
          >
            <div className="font-medium text-sm truncate">{note.title || 'Untitled Note'}</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{note.content.substring(0, 50) || 'No content...'}</div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No notes yet. Create one!
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={() => onSelectNote('settings')} 
          className={`flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors w-full p-2 rounded ${activeNoteId === 'settings' ? 'bg-gray-800 text-white' : ''}`}
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
}
