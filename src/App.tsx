import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { GraphView } from './components/GraphView';
import { Note } from './types';
import { SearchOverlay } from './components/SearchOverlay';
import './App.css';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');

  useEffect(() => {
    loadNotes();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setViewMode(prev => prev === 'editor' ? 'graph' : 'editor');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await invoke<Note[]>('list_notes');
      setNotes(fetchedNotes);
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  };

  const handleCreateNote = async () => {
    const newId = crypto.randomUUID();
    try {
      await invoke('save_note', {
        id: newId,
        title: 'New Note',
        content: ''
      });
      await loadNotes();
      setActiveNoteId(newId);
      setViewMode('editor');
    } catch (e) {
      console.error('Failed to create note:', e);
    }
  };

  const handleUpdateNote = async (id: string, title: string, content: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
    try {
      await invoke('save_note', { id, title, content });
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await invoke('delete_note', { id });
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
      await loadNotes();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <Sidebar 
        notes={notes} 
        activeNoteId={activeNoteId} 
        onSelectNote={(id) => {
          setActiveNoteId(id);
          setViewMode('editor');
        }} 
        onCreateNote={handleCreateNote} 
      />
      {viewMode === 'editor' ? (
        <EditorPane 
          note={activeNote} 
          onUpdateNote={handleUpdateNote} 
          onDeleteNote={handleDeleteNote}
        />
      ) : (
        <GraphView 
          onSelectNote={(id) => {
            setActiveNoteId(id);
            setViewMode('editor');
          }}
        />
      )}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}

export default App;
