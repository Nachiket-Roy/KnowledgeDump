import { Note } from '../types';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { extractTags, generateTitle } from '../lib/ai';
import { Bold, Italic, List, Quote, Download, FileText, Code, PenTool, X, Image as ImageIcon, FileDown, Sparkles } from 'lucide-react';
import { DrawPad, Shape } from './DrawPad';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

interface EditorPaneProps {
  note: Note | null;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  highlightSnippet?: string | null;
  clearHighlight?: () => void;
}

export function EditorPane({ note, onUpdateNote, onDeleteNote, highlightSnippet, clearHighlight }: EditorPaneProps) {
  const viewRef = useRef<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [isTitling, setIsTitling] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(false);
  const [editorFont, setEditorFont] = useState('system');
  const [drawMode, setDrawMode] = useState(false);
  const [drawingData, setDrawingData] = useState<Shape[]>([]);
  const [drawingLoaded, setDrawingLoaded] = useState(false);
  const contentRef = useRef(content);
  
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const lineNums = await invoke<string | null>('get_setting', { key: 'show_line_numbers' });
        if (lineNums && isMounted) setShowLineNumbers(lineNums === 'true');
        
        const autoTitle = await invoke<string | null>('get_setting', { key: 'auto_title_enabled' });
        if (autoTitle && isMounted) setAutoTitleEnabled(autoTitle === 'true');

        const font = await invoke<string | null>('get_setting', { key: 'editor_font' });
        if (font && isMounted) setEditorFont(font);
      } catch(e) {}
    };
    fetchSettings();

    const fetchDrawing = async () => {
      if (!note) return;
      setDrawingLoaded(false);
      try {
        const data = await invoke<string | null>('get_drawing', { noteId: note.id });
        if (data && isMounted) {
          try {
            setDrawingData(JSON.parse(data));
          } catch(e) {
            setDrawingData([]);
          }
        } else {
          setDrawingData([]);
        }
      } catch (e) {
        console.error('Failed to load drawing', e);
        setDrawingData([]);
      } finally {
        if (isMounted) setDrawingLoaded(true);
      }
    };
    fetchDrawing();

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

  useEffect(() => {
    if (!note || !autoTitleEnabled || title !== 'New Note' || content.trim().length < 20) return;

    const timer = setTimeout(async () => {
      setIsTitling(true);
      try {
        const currentContent = contentRef.current;
        const newTitle = await generateTitle(currentContent);
        if (newTitle && newTitle !== 'New Note') {
          setTitle(newTitle);
          onUpdateNote(note.id, newTitle, currentContent);
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

  const handleInsertImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
      });
      if (selected && typeof selected === 'string') {
        const absolutePath = await invoke<string>('copy_image_to_appdata', { sourcePath: selected });
        const webviewUrl = convertFileSrc(absolutePath);
        insertMarkdown(`![Image](${webviewUrl})`);
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
    }
  };

  const handleSaveDrawing = async (shapes: Shape[]) => {
    if (!note) return;
    try {
      const data = JSON.stringify(shapes);
      await invoke('save_drawing', { noteId: note.id, data });
    } catch (e) {
      console.error('Failed to save drawing', e);
    }
  };

  const escapeHtml = (unsafe: string) => unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const handleExportDoc = async () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${escapeHtml(title)}</title></head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <pre style="white-space: pre-wrap; font-family: sans-serif;">${escapeHtml(content)}</pre>
      </body>
      </html>
    `;
    try {
      const filePath = await save({
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `${title || 'note'}.doc`
      });
      if (filePath) {
        await writeTextFile(filePath, htmlContent);
        alert('Exported Word Document successfully!');
      }
    } catch (e) {
      console.error('Failed to export doc:', e);
    }
  };

  const handleExportMd = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: `${title || 'note'}.md`
      });
      if (filePath) {
        const portableContent = content.replace(
          /!\[(.*?)\]\((?:asset:\/\/localhost|https:\/\/asset\.localhost|\/|[a-z]:).*?([^\/\\]+\.(?:png|jpg|jpeg|gif|webp|svg))\)/gi,
          '![$1](images/$2)'
        );
        const mdContent = `# ${title}\n\n${portableContent}`;
        await writeTextFile(filePath, mdContent);
        alert('Exported Markdown successfully!');
      }
    } catch (e) {
      console.error('Failed to export MD:', e);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-theme-bg text-gray-500 font-sans space-y-3">
        <div className="w-12 h-12 rounded-xl bg-theme-input flex items-center justify-center border border-theme-border text-gray-400">
          <Sparkles size={24} />
        </div>
        <p className="text-sm font-medium">Select or create a note to begin editing.</p>
      </div>
    );
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const fontClass = editorFont && editorFont !== 'system' ? `font-editor-${editorFont}` : '';

  return (
    <div className="flex-1 flex flex-col bg-theme-bg h-screen relative overflow-hidden">
      {/* Top Header & Formatting Bar */}
      <div className="p-4 border-b border-theme-border/60 flex flex-col bg-theme-sidebar/40 backdrop-blur-md gap-3 print:hidden z-10">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center flex-1 min-w-0">
            <input 
              type="text" 
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Note..." 
              className="bg-transparent text-2xl font-bold text-gray-100 outline-none flex-1 placeholder-gray-600 tracking-tight"
            />
            {isTitling && (
              <span className="text-xs text-theme-accent animate-pulse font-mono flex items-center gap-1 shrink-0 ml-3">
                <Sparkles size={12} /> titling...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Formatting Tools Group */}
            <div className="flex items-center bg-theme-input/60 rounded-lg p-1 border border-theme-border/70 backdrop-blur-sm">
              <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="Bold"><Bold size={15}/></button>
              <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="Italic"><Italic size={15}/></button>
              <button type="button" onClick={() => insertMarkdown('- ')} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="List"><List size={15}/></button>
              <button type="button" onClick={() => insertMarkdown('> ')} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="Quote"><Quote size={15}/></button>
              <button type="button" onClick={() => insertMarkdown('```\n', '\n```')} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="Code Block"><Code size={15}/></button>
              <button type="button" onClick={handleInsertImage} className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-theme-sidebar rounded transition-colors" title="Insert Local Image"><ImageIcon size={15}/></button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-1 bg-theme-input/40 p-1 rounded-lg border border-theme-border/50">
              <button type="button" onClick={() => window.print()} className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded text-gray-300 hover:text-theme-accent hover:bg-theme-sidebar transition-colors" title="Print to PDF">
                <FileText size={13}/> PDF
              </button>
              <button type="button" onClick={handleExportDoc} className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded text-gray-300 hover:text-theme-accent hover:bg-theme-sidebar transition-colors" title="Export to DOC">
                <Download size={13}/> DOC
              </button>
              <button type="button" onClick={handleExportMd} className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded text-gray-300 hover:text-theme-accent hover:bg-theme-sidebar transition-colors" title="Export to Markdown">
                <FileDown size={13}/> MD
              </button>
            </div>

            <button 
              type="button"
              onClick={() => onDeleteNote(note.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 hover:bg-red-900/40 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* Concept Tags Row */}
        <div className="flex flex-wrap gap-1.5 items-center min-h-[22px]">
          {tags.map(tag => (
            <span key={tag} className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-theme-accent/10 text-theme-accent border border-theme-accent/30">
              #{tag}
            </span>
          ))}
          {isTagging && (
            <span className="text-xs text-gray-400 font-mono animate-pulse flex items-center gap-1">
              <Sparkles size={12} className="text-theme-accent" /> Extracting tags...
            </span>
          )}
        </div>
      </div>

      {/* Editor & Canvas Container */}
      <div className="flex-1 flex flex-col overflow-hidden print:bg-white print:text-black relative">
        <div className="flex-1 relative overflow-auto p-4">
          <div className="relative min-h-full max-w-4xl mx-auto">
            <CodeMirror
              value={content}
              height="100%"
              theme={oneDark}
              basicSetup={{ lineNumbers: showLineNumbers }}
              extensions={[markdown({ base: markdownLanguage }), EditorView.lineWrapping]}
              onChange={handleContentChange}
              onCreateEditor={(view) => { viewRef.current = view; }}
              className={`text-base h-full ${fontClass}`}
            />
            {drawingLoaded && (
              <DrawPad 
                drawMode={drawMode} 
                initialData={drawingData} 
                onSave={handleSaveDrawing} 
              />
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-8 px-6 bg-theme-sidebar/80 border-t border-theme-border/60 flex items-center justify-between text-xs text-gray-400 font-mono select-none print:hidden z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{charCount.toLocaleString()} chars</span>
            <span>·</span>
            <span>{readingTime} min read</span>
          </div>
          <div className="text-[11px] opacity-75">
            Markdown Workspace
          </div>
        </div>

        {/* Floating Action Bar (FAB) for Canvas Toggle */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center glass-panel rounded-full p-1.5 shadow-2xl z-50 print:hidden glass-glow">
          <button 
            type="button"
            onClick={() => setDrawMode(!drawMode)} 
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 text-xs font-semibold ${
              drawMode 
                ? 'bg-theme-accent text-gray-950 glass-glow' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title={drawMode ? "Close Canvas View" : "Open Canvas View"}
          >
            {drawMode ? <X size={16} /> : <PenTool size={16} />}
            <span>{drawMode ? 'Close Canvas' : 'DrawPad Canvas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
