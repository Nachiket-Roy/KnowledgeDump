import React, { useRef, useEffect, useState, useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { 
  Type, Square, Circle, Triangle, PenTool, 
  ArrowRight, Minus, Undo2, Redo2, Trash2, Save, Hexagon,
  Eraser
} from 'lucide-react';

export type ToolType = 'sel' | 'free' | 'line' | 'arr' | 'rect' | 'rrect' | 'circ' | 'tri' | 'diam' | 'txt' | 'erase';

export type Shape =
  | { id: string, type: 'line' | 'arr', x1: number, y1: number, x2: number, y2: number, color: string, lw: number }
  | { id: string, type: 'rect' | 'rrect' | 'circ' | 'tri' | 'diam', x: number, y: number, w: number, h: number, fill: string | null, color: string, lw: number }
  | { id: string, type: 'free', pts: {x: number, y: number}[], color: string, lw: number }
  | { id: string, type: 'txt', text: string, x: number, y: number, fs: number, color: string, lw: number };

export interface DrawPadProps {
  drawMode: boolean;
  initialData: Shape[];
  onSave: (shapes: Shape[]) => void;
}

const COLORS = ['#ffffff', '#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
const FONT_SIZE = 24;

export function DrawPad({ drawMode, initialData, onSave }: DrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [shapes, setShapes] = useState<Shape[]>(Array.isArray(initialData) ? initialData : []);
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  
  const [tool, setTool] = useState<ToolType>('free');
  const [color, setColor] = useState<string>('#ffffff');
  const [fill, setFill] = useState<string | null>(null);
  const [lw, setLw] = useState<number>(3);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  
  // For text input
  const [textInput, setTextInput] = useState<{x: number, y: number, value: string} | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(shapes);
    }, 1000);
    return () => clearTimeout(timer);
  }, [shapes, onSave]);

  const saveState = useCallback((newShapes: Shape[]) => {
    setUndoStack(prev => [...prev, shapes].slice(-20)); // Keep last 20 states
    setRedoStack([]);
    setShapes(newShapes);
  }, [shapes]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, shapes]);
    setUndoStack(prev => prev.slice(0, -1));
    setShapes(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, shapes]);
    setRedoStack(prev => prev.slice(0, -1));
    setShapes(next);
  };

  const handleClear = () => {
    saveState([]);
  };

  const drawShapes = useCallback((ctx: CanvasRenderingContext2D, shapesToDraw: Shape[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    shapesToDraw.forEach(shape => {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if ('fill' in shape && shape.fill) {
        ctx.fillStyle = shape.fill;
      } else {
        ctx.fillStyle = 'transparent';
      }

      ctx.beginPath();
      switch (shape.type) {
        case 'free':
          if (shape.pts.length > 0) {
            ctx.moveTo(shape.pts[0].x, shape.pts[0].y);
            for (let i = 1; i < shape.pts.length; i++) {
              ctx.lineTo(shape.pts[i].x, shape.pts[i].y);
            }
            ctx.stroke();
          }
          break;
        case 'line':
          ctx.moveTo(shape.x1, shape.y1);
          ctx.lineTo(shape.x2, shape.y2);
          ctx.stroke();
          break;
        case 'arr':
          ctx.moveTo(shape.x1, shape.y1);
          ctx.lineTo(shape.x2, shape.y2);
          ctx.stroke();
          // Draw arrowhead
          const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
          const headlen = 10 + shape.lw;
          ctx.beginPath();
          ctx.moveTo(shape.x2, shape.y2);
          ctx.lineTo(shape.x2 - headlen * Math.cos(angle - Math.PI / 6), shape.y2 - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(shape.x2 - headlen * Math.cos(angle + Math.PI / 6), shape.y2 - headlen * Math.sin(angle + Math.PI / 6));
          ctx.lineTo(shape.x2, shape.y2);
          ctx.fillStyle = shape.color;
          ctx.fill();
          break;
        case 'rect':
          if (shape.fill) ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
          ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
          break;
        case 'circ':
          ctx.ellipse(shape.x + shape.w/2, shape.y + shape.h/2, Math.abs(shape.w/2), Math.abs(shape.h/2), 0, 0, 2 * Math.PI);
          if (shape.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'tri':
          ctx.moveTo(shape.x + shape.w/2, shape.y);
          ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
          ctx.lineTo(shape.x, shape.y + shape.h);
          ctx.closePath();
          if (shape.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'diam':
          ctx.moveTo(shape.x + shape.w/2, shape.y);
          ctx.lineTo(shape.x + shape.w, shape.y + shape.h/2);
          ctx.lineTo(shape.x + shape.w/2, shape.y + shape.h);
          ctx.lineTo(shape.x, shape.y + shape.h/2);
          ctx.closePath();
          if (shape.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'txt':
          ctx.font = `${shape.fs}px sans-serif`;
          ctx.fillStyle = shape.color;
          ctx.fillText(shape.text, shape.x, shape.y + shape.fs);
          break;
      }
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const allShapes = currentShape ? [...shapes, currentShape] : shapes;
    drawShapes(ctx, allShapes);
  }, [shapes, currentShape, drawShapes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const wrapper = canvas.parentElement;
    const cmScroller = wrapper?.querySelector('.cm-scroller') as HTMLElement | null;
    const source = cmScroller ?? wrapper;
    
    if (!source) return;

    const syncSize = () => {
      if (canvas.width !== source.scrollWidth || canvas.height !== source.scrollHeight) {
        canvas.width = source.scrollWidth;
        canvas.height = source.scrollHeight;
        canvas.style.width = `${source.scrollWidth}px`;
        canvas.style.height = `${source.scrollHeight}px`;
        render();
      }
    };
    
    const ro = new ResizeObserver(syncSize);
    ro.observe(source);
    syncSize();
    
    source.addEventListener('scroll', render);
    
    return () => {
      ro.disconnect();
      source.removeEventListener('scroll', render);
    };
  }, [render]);

  useEffect(() => {
    render();
  }, [shapes, currentShape, render]);

  const getCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const wrapper = canvas.parentElement as HTMLElement;
    const cmScroller = wrapper?.querySelector('.cm-scroller') as HTMLElement | null;
    const source = cmScroller ?? wrapper;

    const scrollLeft = source?.scrollLeft ?? 0;
    const scrollTop  = source?.scrollTop  ?? 0;

    const canvasLeft = canvas.offsetLeft;
    const canvasTop  = canvas.offsetTop;

    const sourceRect = source.getBoundingClientRect();
    
    return {
      x: (e.clientX - sourceRect.left) + scrollLeft - canvasLeft,
      y: (e.clientY - sourceRect.top)  + scrollTop  - canvasTop
    };
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    if (!drawMode) return;
    if (e.button !== 0) return; // Only left click

    const coords = getCoords(e);
    const { x, y } = coords;

    if (tool === 'txt') {
      if (textInput) {
        // save existing
        if (textInput.value.trim()) {
          saveState([...shapes, { id: crypto.randomUUID(), type: 'txt', text: textInput.value, x: textInput.x, y: textInput.y, fs: FONT_SIZE, color, lw }]);
        }
        setTextInput(null);
      } else {
        setTextInput({ x, y, value: '' });
        setTimeout(() => textInputRef.current?.focus(), 10);
      }
      return;
    }

    if (tool === 'erase') {
      // Basic eraser: click on shape to remove
      // (This is a naive hit test, just checking bounding box)
      const toRemove = shapes.findIndex(s => {
        if (s.type === 'free') {
          return s.pts.some(p => Math.abs(p.x - x) < 10 && Math.abs(p.y - y) < 10);
        } else if ('w' in s) {
          return x >= Math.min(s.x, s.x+s.w) && x <= Math.max(s.x, s.x+s.w) && y >= Math.min(s.y, s.y+s.h) && y <= Math.max(s.y, s.y+s.h);
        } else if ('x1' in s) {
          const minX = Math.min(s.x1, s.x2);
          const maxX = Math.max(s.x1, s.x2);
          const minY = Math.min(s.y1, s.y2);
          const maxY = Math.max(s.y1, s.y2);
          return x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5;
        } else if (s.type === 'txt') {
          return x >= s.x && x <= s.x + 100 && y >= s.y && y <= s.y + s.fs;
        }
        return false;
      });
      if (toRemove !== -1) {
        saveState(shapes.filter((_, i) => i !== toRemove));
      }
      return;
    }

    setIsDrawing(true);
    const id = crypto.randomUUID();

    if (tool === 'free') {
      setCurrentShape({ id, type: 'free', pts: [{x, y}], color, lw });
    } else if (tool === 'line' || tool === 'arr') {
      setCurrentShape({ id, type: tool, x1: x, y1: y, x2: x, y2: y, color, lw });
    } else if (['rect', 'circ', 'tri', 'diam'].includes(tool)) {
      setCurrentShape({ id, type: tool as any, x, y, w: 0, h: 0, fill, color, lw });
    }
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentShape || !drawMode) return;
    
    const { x, y } = getCoords(e);
    
    if (currentShape.type === 'free') {
      setCurrentShape({
        ...currentShape,
        pts: [...currentShape.pts, { x, y }]
      });
    } else if (currentShape.type === 'line' || currentShape.type === 'arr') {
      setCurrentShape({
        ...currentShape,
        x2: x, y2: y
      });
    } else if ('w' in currentShape) {
      setCurrentShape({
        ...currentShape,
        w: x - currentShape.x,
        h: y - currentShape.y
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);
    saveState([...shapes, currentShape]);
    setCurrentShape(null);
  };

  const handleSavePng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      // White background for PNG
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = canvas.width;
      tmpCanvas.height = canvas.height;
      const ctx = tmpCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#272727'; // match theme bg
        ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
        drawShapes(ctx, shapes);
      }
      
      const dataUrl = tmpCanvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      
      // We convert base64 to Uint8Array to write
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const filePath = await save({
        filters: [{ name: 'Image', extensions: ['png'] }],
        defaultPath: 'note-drawing.png'
      });

      if (filePath) {
        await writeFile(filePath, bytes);
        alert('Saved successfully!');
      }
    } catch (e) {
      console.error('Failed to save PNG', e);
      alert('Error saving PNG.');
    }
  };

  // Render minimal toolbar
  if (!drawMode) {
    return (
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 z-10 pointer-events-none print:invert"
      />
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        className="absolute top-0 left-0 z-10 touch-none cursor-crosshair print:invert"
      />

      {textInput && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput.value}
          onChange={e => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (textInput.value.trim()) {
                saveState([...shapes, { id: crypto.randomUUID(), type: 'txt', text: textInput.value, x: textInput.x, y: textInput.y, fs: FONT_SIZE, color, lw }]);
              }
              setTextInput(null);
            }
          }}
          onBlur={() => {
            if (textInput.value.trim()) {
              saveState([...shapes, { id: crypto.randomUUID(), type: 'txt', text: textInput.value, x: textInput.x, y: textInput.y, fs: FONT_SIZE, color, lw }]);
            }
            setTextInput(null);
          }}
          className="absolute z-50 bg-transparent outline-none border border-theme-accent/50 text-white"
          style={{
            left: textInput.x,
            top: textInput.y,
            fontSize: `${FONT_SIZE}px`,
            color: color,
            fontFamily: 'sans-serif'
          }}
        />
      )}

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-theme-sidebar/95 backdrop-blur-md border border-theme-border rounded-xl shadow-2xl z-50 p-2 pointer-events-auto">
        <div className="flex items-center gap-1">
          <ToolBtn icon={<PenTool size={18} />} active={tool === 'free'} onClick={() => setTool('free')} title="Freehand" />
          <ToolBtn icon={<Minus size={18} />} active={tool === 'line'} onClick={() => setTool('line')} title="Line" />
          <ToolBtn icon={<ArrowRight size={18} />} active={tool === 'arr'} onClick={() => setTool('arr')} title="Arrow" />
          <ToolBtn icon={<Square size={18} />} active={tool === 'rect'} onClick={() => setTool('rect')} title="Rectangle" />
          <ToolBtn icon={<Circle size={18} />} active={tool === 'circ'} onClick={() => setTool('circ')} title="Ellipse" />
          <ToolBtn icon={<Triangle size={18} />} active={tool === 'tri'} onClick={() => setTool('tri')} title="Triangle" />
          <ToolBtn icon={<Hexagon size={18} />} active={tool === 'diam'} onClick={() => setTool('diam')} title="Diamond" />
          <ToolBtn icon={<Type size={18} />} active={tool === 'txt'} onClick={() => setTool('txt')} title="Text" />
          <ToolBtn icon={<Eraser size={18} />} active={tool === 'erase'} onClick={() => setTool('erase')} title="Eraser" />
          
          <div className="w-px h-6 bg-theme-border mx-1"></div>
          
          <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 text-gray-300" title="Undo"><Undo2 size={18} /></button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 text-gray-300" title="Redo"><Redo2 size={18} /></button>
          <button onClick={handleClear} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg" title="Clear All"><Trash2 size={18} /></button>
          <button onClick={handleSavePng} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg" title="Export PNG"><Save size={18} /></button>
        </div>
        
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-theme-accent' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="w-px h-4 bg-theme-border"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Fill:</span>
            <button onClick={() => setFill(null)} className={`w-5 h-5 rounded border border-gray-600 flex items-center justify-center text-[10px] ${fill === null ? 'ring-1 ring-theme-accent' : ''}`}>X</button>
            {COLORS.map(c => (
              <button key={`fill-${c}`} onClick={() => setFill(c)} className={`w-5 h-5 rounded border border-gray-600 ${fill === c ? 'ring-1 ring-theme-accent' : ''}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="w-px h-4 bg-theme-border"></div>
          <input type="range" min="1" max="16" value={lw} onChange={e => setLw(parseInt(e.target.value))} className="w-24 accent-theme-accent" />
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-theme-accent text-theme-bg px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-none z-50">
        Drawing Mode Active
      </div>
    </>
  );
}

function ToolBtn({ icon, active, onClick, title }: { icon: React.ReactNode, active: boolean, onClick: () => void, title: string }) {
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`p-2 rounded-lg transition-colors ${active ? 'bg-theme-accent text-theme-bg' : 'text-gray-300 hover:bg-white/10'}`}
    >
      {icon}
    </button>
  );
}
