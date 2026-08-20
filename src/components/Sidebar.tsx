import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';
import { Plus, Search, FileText, Settings as SettingsIcon, Trash2, Tag, X } from 'lucide-react';

export interface TagWithCount {
  id: string;
  name: string;
  count: number;
}

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
}

export function Sidebar({ notes, activeNoteId, onSelectNote, onCreateNote, onDeleteNote }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'and' | 'or'>('and');
  const [filteredNotes, setFilteredNotes] = useState<Note[] | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

  useEffect(() => {
    loadTags();
  }, [notes]);

  useEffect(() => {
    if (selectedTagIds.length > 0) {
      applyTagFilter();
    } else {
      setFilteredNotes(null);
    }
  }, [selectedTagIds, filterMode]);

  const loadTags = async () => {
    try {
      const tags = await invoke<TagWithCount[]>('list_all_tags');
      setAllTags(tags);
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  };

  const applyTagFilter = async () => {
    try {
      const result = await invoke<Note[]>('list_notes_by_tags', {
        tagIds: selectedTagIds,
        mode: filterMode,
      });
      setFilteredNotes(result);
    } catch (e) {
      console.error('Failed to filter notes by tags:', e);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const clearTagFilters = () => {
    setSelectedTagIds([]);
    setFilteredNotes(null);
  };

  const displayedNotes = (filteredNotes !== null ? filteredNotes : notes).filter(note => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
  });

  return (
    <div className="w-64 bg-theme-sidebar border-r border-theme-border flex flex-col h-screen text-gray-200 print:hidden">
      <div className="p-4 flex items-center justify-between border-b border-theme-border">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-theme-accent" />
          KnowledgeDump
        </h1>
        <button onClick={onCreateNote} className="p-1 hover:bg-theme-bg rounded text-gray-400 hover:text-white" title="New Note">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3 space-y-2 border-b border-theme-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes..." 
            className="w-full bg-theme-input text-sm rounded-md py-2 pl-9 pr-3 outline-none focus:ring-1 focus:ring-theme-accent border border-theme-border placeholder-gray-500"
          />
        </div>

        {allTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 px-1 py-1">
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className="flex items-center gap-1 hover:text-gray-200 transition-colors"
              >
                <Tag size={12} />
                <span>Tags {selectedTagIds.length > 0 && `(${selectedTagIds.length})`}</span>
              </button>
              
              {selectedTagIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterMode(filterMode === 'and' ? 'or' : 'and')}
                    className="px-1.5 py-0.5 rounded bg-theme-input hover:bg-theme-border text-[10px] font-semibold text-theme-accent uppercase"
                  >
                    {filterMode}
                  </button>
                  <button onClick={clearTagFilters} className="text-gray-400 hover:text-red-400" title="Clear Tag Filters">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {(showTagFilter || selectedTagIds.length > 0) && (
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-1">
                {allTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-theme-accent text-white border-theme-accent'
                          : 'bg-theme-input/50 text-gray-400 border-theme-border hover:border-gray-500'
                      }`}
                    >
                      <span>#{tag.name}</span>
                      <span className="opacity-60 text-[9px]">({tag.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayedNotes.map(note => (
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
        {displayedNotes.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            {selectedTagIds.length > 0 ? 'No notes match tag filters.' : 'No notes found.'}
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
