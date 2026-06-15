import { Note } from '../types';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useState, useEffect } from 'react';

interface EditorPaneProps {
  note: Note | null;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
}

export function EditorPane({ note, onUpdateNote, onDeleteNote }: EditorPaneProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [note?.id]);

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
      <div className="flex-1 flex items-center justify-center bg-[#282c34] text-gray-500">
        Select or create a note to begin editing.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#282c34] h-screen">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
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
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[markdown({ base: markdownLanguage })]}
          onChange={handleContentChange}
          className="text-base h-full"
        />
      </div>
    </div>
  );
}
