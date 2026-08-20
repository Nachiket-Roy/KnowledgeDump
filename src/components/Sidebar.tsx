import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';
import { Plus, Search, FileText, Settings as SettingsIcon, Trash2, Tag, X, Sparkles } from 'lucide-react';

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
    let isCancelled = false;
    const loadTags = async () => {
      try {
        const tags = await invoke<TagWithCount[]>('list_all_tags');
        if (!isCancelled) setAllTags(tags);
      } catch (e) {
        console.error('Failed to load tags:', e);
      }
    };
    loadTags();
    return () => { isCancelled = true; };
  }, [notes]);

  useEffect(() => {
    let isCancelled = false;
    if (selectedTagIds.length > 0) {
      const applyTagFilter = async () => {
        try {
          const result = await invoke<Note[]>('list_notes_by_tags', {
            tagIds: selectedTagIds,
            mode: filterMode,
          });
          if (!isCancelled) setFilteredNotes(result);
        } catch (e) {
          console.error('Failed to filter notes by tags:', e);
        }
      };
      applyTagFilter();
    } else {
      setFilteredNotes(null);
    }
    return () => { isCancelled = true; };
  }, [selectedTagIds, filterMode, notes]);

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
    <div className="w-72 bg-theme-sidebar border-r border-theme-border flex flex-col h-screen text-gray-200 select-none print:hidden backdrop-blur-xl relative z-20">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-theme-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-theme-accent/15 border border-theme-accent/40 flex items-center justify-center text-theme-accent glass-glow">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-gray-100 flex items-center gap-1.5">
              KnowledgeDump
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">Local Knowledge</p>
          </div>
        </div>
        <button
          onClick={onCreateNote}
          className="p-2 bg-theme-accent/10 hover:bg-theme-accent/25 text-theme-accent border border-theme-accent/30 rounded-lg transition-all hover:scale-105 active:scale-95"
          title="Create New Note"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {/* Search & Filter Controls */}
      <div className="p-3 space-y-2.5 border-b border-theme-border/50 bg-theme-sidebar/50">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes... (Ctrl+K)" 
            className="w-full glass-input text-xs rounded-lg py-2 pl-9 pr-8 outline-none text-gray-100 placeholder-gray-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-gray-400 hover:text-gray-200 p-0.5"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 px-1 py-1">
              <button
                type="button"
                onClick={() => setShowTagFilter(!showTagFilter)}
                className="flex items-center gap-1.5 text-gray-300 hover:text-theme-accent transition-colors"
              >
                <Tag size={12} className="text-theme-accent" />
                <span>Concept Tags {selectedTagIds.length > 0 && `(${selectedTagIds.length})`}</span>
              </button>
              
              {selectedTagIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterMode(filterMode === 'and' ? 'or' : 'and')}
                    className="px-1.5 py-0.5 rounded bg-theme-accent/15 border border-theme-accent/30 text-[10px] font-mono font-semibold text-theme-accent uppercase hover:bg-theme-accent/30 transition-colors"
                    title="Toggle Filter Match Logic (AND: notes must have all tags, OR: any tag)"
                  >
                    {filterMode}
                  </button>
                  <button
                    type="button"
                    onClick={clearTagFilters}
                    className="text-gray-400 hover:text-red-400 p-0.5"
                    title="Clear Tag Filters"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {(showTagFilter || selectedTagIds.length > 0) && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1.5">
                {allTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 font-mono ${
                        isSelected
                          ? 'bg-theme-accent text-gray-950 font-bold border-theme-accent glass-glow'
                          : 'bg-theme-input/40 text-gray-400 border-theme-border hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      <span>#{tag.name}</span>
                      <span className="opacity-70 text-[10px]">({tag.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {displayedNotes.map(note => {
          const isActive = activeNoteId === note.id;
          return (
            <div 
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all border flex items-center justify-between ${
                isActive 
                  ? 'bg-theme-accent/10 border-theme-accent/40 text-gray-100 glass-glow' 
                  : 'bg-transparent border-transparent hover:bg-theme-input/40 hover:border-theme-border text-gray-300'
              }`}
            >
              {/* Active Item Vertical Glow Line */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-theme-accent rounded-r-full" />
              )}
              
              <div className="flex-1 min-w-0 pr-2 pl-1">
                <div className="font-medium text-xs truncate text-gray-100 flex items-center gap-1.5">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-theme-accent' : 'text-gray-500'}`} />
                  <span className="truncate">{note.title || 'Untitled Note'}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 truncate pl-5 font-sans">
                  {note.content.substring(0, 45) || 'Empty note...'}
                </div>
              </div>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/15 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
                title="Delete Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {displayedNotes.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-xs font-sans space-y-1">
            <p className="font-medium">{selectedTagIds.length > 0 ? 'No notes match tag filters.' : 'No notes captured yet.'}</p>
            <p className="text-[11px] opacity-70">Click + to start writing.</p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-2.5 border-t border-theme-border/60 bg-theme-sidebar/80 flex items-center gap-2">
        <button 
          type="button"
          onClick={() => onSelectNote('settings')} 
          aria-pressed={activeNoteId === 'settings'}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-lg border transition-all ${
            activeNoteId === 'settings' 
              ? 'bg-theme-accent/15 border-theme-accent/40 text-theme-accent' 
              : 'bg-theme-input/40 border-theme-border text-gray-400 hover:text-gray-100 hover:border-gray-600'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
