import { Note } from '../types';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { extractTags, generateTitle } from '../lib/ai';
import { Bold, Italic, List, Quote, Download, FileText, Code, PenTool, X } from 'lucide-react';
import { Excalidraw } from '@excalidraw/excalidraw';

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
  const [isTitling, setIsTitling] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(false);
  const [showExcalidraw, setShowExcalidraw] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const lineNums = await invoke<string | null>('get_setting', { key: 'show_line_numbers' });
        if (lineNums && isMounted) setShowLineNumbers(lineNums === 'true');
        
        const autoTitle = await invoke<string | null>('get_setting', { key: 'auto_title_enabled' });
        if (autoTitle && isMounted) setAutoTitleEnabled(autoTitle === 'true');
      } catch(e) {}
    };
    fetchSettings();

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
        if (newTags.length > 0) setTags(newTags);
        else setTags([]);
      } catch (e) {
        console.error('Auto-tagging failed:', e);
      } finally {
        setIsTagging(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [content, note?.id]);

  // Debounce auto-title after 3 seconds of inactivity if enabled and title is "New Note"
  useEffect(() => {
    if (!note || !autoTitleEnabled || title !== 'New Note' || content.trim().length < 20) return;

    const timer = setTimeout(async () => {
      setIsTitling(true);
      try {
        const newTitle = await generateTitle(content);
        if (newTitle && newTitle !== 'New Note') {
          setTitle(newTitle);
          onUpdateNote(note.id, newTitle, content);
        }
      } catch (e) {
        console.error('Auto-title failed:', e);
      } finally {
        setIsTitling(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [content, title, autoTitleEnabled, note?.id]);

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

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `${prefix}${selectedText}${suffix}`
      },
      selection: { anchor: selection.from + prefix.length, head: selection.from + prefix.length + selectedText.length }
    });
    view.focus();
  };

  const handleExportDoc = () => {
    const element = document.createElement('a');
    // Using simple HTML-in-DOC format which Word reads perfectly
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${title}</title></head>
      <body>
        <h1>${title}</h1>
        <pre style="white-space: pre-wrap; font-family: sans-serif;">${content}</pre>
      </body>
      </html>
    `;
    element.setAttribute('href', 'data:application/msword;charset=utf-8,' + encodeURIComponent(htmlContent));
    element.setAttribute('download', `${title || 'note'}.doc`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          <div className="flex items-center flex-1">
            <input 
              type="text" 
              value={title}
              onChange={handleTitleChange}
              placeholder="Note Title" 
              className="bg-transparent text-xl font-bold text-gray-100 outline-none flex-1 placeholder-gray-600"
            />
            {isTitling && <span className="text-xs text-theme-accent animate-pulse ml-2">generating title...</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-theme-input/50 rounded-md p-1 border border-theme-border mr-2">
              <button onClick={() => insertMarkdown('**', '**')} className="p-1.5 text-gray-400 hover:text-white hover:bg-theme-sidebar rounded transition-colors" title="Bold"><Bold size={16}/></button>
              <button onClick={() => insertMarkdown('*', '*')} className="p-1.5 text-gray-400 hover:text-white hover:bg-theme-sidebar rounded transition-colors" title="Italic"><Italic size={16}/></button>
              <button onClick={() => insertMarkdown('- ')} className="p-1.5 text-gray-400 hover:text-white hover:bg-theme-sidebar rounded transition-colors" title="List"><List size={16}/></button>
              <button onClick={() => insertMarkdown('> ')} className="p-1.5 text-gray-400 hover:text-white hover:bg-theme-sidebar rounded transition-colors" title="Quote"><Quote size={16}/></button>
              <button onClick={() => insertMarkdown('```\n', '\n```')} className="p-1.5 text-gray-400 hover:text-white hover:bg-theme-sidebar rounded transition-colors" title="Code Block"><Code size={16}/></button>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors" title="Print to PDF">
              <FileText size={14}/> PDF
            </button>
            <button onClick={handleExportDoc} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors">
              <Download size={14}/> DOC
            </button>
            <button 
              onClick={() => onDeleteNote(note.id)}
              className="text-xs px-3 py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors ml-2"
            >
              Delete
            </button>
          </div>
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
      <div className="flex-1 overflow-auto print:bg-white print:text-black relative">
        {showExcalidraw ? (
          <div className="absolute inset-0 z-40 bg-theme-bg">
            <Excalidraw theme="dark" />
          </div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            basicSetup={{ lineNumbers: showLineNumbers }}
            extensions={[markdown({ base: markdownLanguage })]}
            onChange={handleContentChange}
            onCreateEditor={(view) => { viewRef.current = view; }}
            className="text-base h-full"
          />
        )}

        {/* Floating Toolbar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-theme-sidebar/90 backdrop-blur-md border border-theme-border rounded-full shadow-2xl z-50">
          <button 
            onClick={() => setShowExcalidraw(!showExcalidraw)} 
            className={`p-3 rounded-full transition-colors flex items-center gap-2 font-medium ${showExcalidraw ? 'bg-theme-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            title={showExcalidraw ? "Close Drawing Mode" : "Open Drawing Mode"}
          >
            {showExcalidraw ? <X size={20} /> : <PenTool size={20} />}
            {showExcalidraw && <span className="pr-2">Close Canvas</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
