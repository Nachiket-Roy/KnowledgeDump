import { Note } from '../types';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { extractTags } from '../lib/ai';

interface EditorPaneProps {
  note: Note | null;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  highlightSnippet?: string | null;
  clearHighlight?: () => void;
}

export function EditorPane({ note, onUpdateNote, onDeleteNote, highlightSnippet, clearHighlight }: EditorPaneProps) {
  const viewRef = React.useRef<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (note) {
      setTitle(note.title);
      setContent(note.content);
      loadTags(note.id, () => isMounted);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }

    return () => { isMounted = false; };
  }, [note?.id]);

  const loadTags = async (noteId: string, isMounted: () => boolean) => {
    try {
      const fetchedTags = await invoke<string[]>('get_note_tags', { noteId });
      if (isMounted()) {
        setTags(fetchedTags);
      }
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  };

  // Debounce auto-tagging after 2.5 seconds of inactivity
  useEffect(() => {
    if (!note || !content.trim()) return;

    const timer = setTimeout(async () => {
      setIsTagging(true);
      try {
        const newTags = await extractTags(content);
        await invoke('add_tags_to_note', { noteId: note.id, tags: newTags });
        if (newTags.length > 0) {
          setTags(newTags);
        } else {
          setTags([]);
        }
      } catch (e) {
        console.error('Auto-tagging failed:', e);
      } finally {
        setIsTagging(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [content, note?.id]);

  useEffect(() => {
    if (highlightSnippet && viewRef.current && content) {
      // Small timeout to let the editor render completely
      setTimeout(() => {
        if (!viewRef.current) return;
        const index = content.indexOf(highlightSnippet.trim());
        if (index !== -1) {
          viewRef.current.dispatch({
            selection: { anchor: index, head: index + highlightSnippet.trim().length },
            effects: [EditorView.scrollIntoView(index, { y: 'center' })]
          });
        }
        if (clearHighlight) clearHighlight();
      }, 100);
    }
  }, [highlightSnippet, content]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (note) {
      onUpdateNote(note.id, newTitle, content);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (note) {
      onUpdateNote(note.id, title, value);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-theme-bg text-gray-500">
        Select or create a note to begin editing.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-theme-bg h-screen">
      <div className="p-4 border-b border-theme-border flex flex-col bg-theme-bg gap-2">
        <div className="flex justify-between items-center">
          <input 
            type="text" 
            value={title}
            onChange={handleTitleChange}
            placeholder="Note Title" 
            className="bg-transparent text-xl font-bold text-gray-100 outline-none flex-1 placeholder-gray-600"
          />
          <button 
            onClick={() => onDeleteNote(note.id)}
            className="text-xs px-3 py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            Delete
          </button>
        </div>
        
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
          {tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-theme-accent/20 text-theme-accent border border-theme-accent/50">
              #{tag}
            </span>
          ))}
          {isTagging && (
            <span className="text-xs text-gray-500 animate-pulse flex items-center gap-1">
              ✨ Auto-tagging...
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[markdown({ base: markdownLanguage })]}
          onChange={handleContentChange}
          onCreateEditor={(view) => { viewRef.current = view; }}
          className="text-base h-full"
        />
      </div>
    </div>
  );
}
