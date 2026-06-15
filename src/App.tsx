import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { GraphView } from './components/GraphView';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { Note } from './types';
import { SearchOverlay } from './components/SearchOverlay';
import { TabBar } from './components/TabBar';
import { upsertNoteVectors } from './lib/vectorSync';
import './App.css';

const vectorSyncTimers = new Map<string, any>();

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [highlightSnippet, setHighlightSnippet] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'graph' | 'settings'>('editor');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadNotes();
    checkOnboarding();
    
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

  const checkOnboarding = async () => {
    try {
      const onboarded = await invoke<string | null>('get_setting', { key: 'has_onboarded' });
      if (!onboarded) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error('Failed to check onboarding:', e);
    }
  };

  const loadNotes = async () => {
    try {
      const fetchedNotes = await invoke<Note[]>('list_notes');
      setNotes(fetchedNotes);
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  };

  const generateId = () => {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for non-secure contexts (e.g. testing over HTTP IP)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleCreateNote = async () => {
    const newId = generateId();
    try {
      await invoke('save_note', {
        id: newId,
        title: 'New Note',
        content: ''
      });
      await loadNotes();
      setOpenNoteIds(prev => [...prev, newId]);
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
      
      // Debounce vector sync for 2 seconds
      if (vectorSyncTimers.has(id)) clearTimeout(vectorSyncTimers.get(id));
      vectorSyncTimers.set(id, setTimeout(() => {
        upsertNoteVectors({ id, title, content, created_at: '', updated_at: '' }).catch(console.error);
        vectorSyncTimers.delete(id);
      }, 2000));
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await invoke('delete_note', { id });
      
      setOpenNoteIds(prev => {
        const next = prev.filter(nId => nId !== id);
        if (activeNoteId === id) {
          setActiveNoteId(next.length > 0 ? next[next.length - 1] : null);
        }
        return next;
      });
      
      await loadNotes();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-bg">
      <Sidebar 
        notes={notes} 
        activeNoteId={activeNoteId} 
        onSelectNote={(id) => {
          if (id === 'settings') {
            setViewMode('settings');
            setActiveNoteId('settings');
          } else {
            setOpenNoteIds(prev => prev.includes(id) ? prev : [...prev, id]);
            setActiveNoteId(id);
            setViewMode('editor');
          }
        }} 
        onCreateNote={handleCreateNote} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TabBar 
          openNotes={openNoteIds.map(id => notes.find(n => n.id === id)).filter(Boolean) as Note[]}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          onCloseNote={(id, e) => {
            e.stopPropagation();
            setOpenNoteIds(prev => {
              const next = prev.filter(n => n !== id);
              if (activeNoteId === id) {
                setActiveNoteId(next.length > 0 ? next[next.length - 1] : null);
              }
              return next;
            });
          }}
        />

        {viewMode === 'settings' ? (
          <SettingsView />
        ) : viewMode === 'editor' ? (
        <EditorPane 
          note={activeNote} 
          onUpdateNote={handleUpdateNote} 
          onDeleteNote={handleDeleteNote}
          highlightSnippet={highlightSnippet}
          clearHighlight={() => setHighlightSnippet(null)}
        />
      ) : (
        <GraphView 
          onSelectNote={(id) => {
            setActiveNoteId(id);
            setViewMode('editor');
          }}
        />
      )}
      </div>

      <SearchOverlay 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelectNote={(id, snippet) => {
          setOpenNoteIds(prev => prev.includes(id) ? prev : [...prev, id]);
          setActiveNoteId(id);
          setHighlightSnippet(snippet || null);
          setViewMode('editor');
        }} 
      />
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
}

export default App;
