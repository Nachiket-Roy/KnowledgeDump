import { useEffect, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { invoke } from '@tauri-apps/api/core';
import { GraphData, GraphNode } from '../types';

interface GraphViewProps {
  onSelectNote: (noteId: string) => void;
}

export function GraphView({ onSelectNote }: GraphViewProps) {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods>();

  useEffect(() => {
    loadGraphData();
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const loadGraphData = async () => {
    try {
      const graphData = await invoke<GraphData>('get_graph_data');
      setData(graphData);
      
      // Auto-fit after data loads
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 100);
    } catch (e) {
      console.error('Failed to load graph data:', e);
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    if (node.group === 'note') {
      onSelectNote(node.id);
    } else {
      // It's a tag, maybe center on it
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(8, 2000);
      }
    }
  };

  return (
    <div ref={containerRef} className="flex-1 bg-[#282c34] h-screen overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur-sm text-sm text-gray-300">
        <h3 className="font-bold text-gray-100 mb-1">Knowledge Graph</h3>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#4ade80]"></div>
          <span>Notes ({data.nodes.filter(n => n.group === 'note').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#60a5fa]"></div>
          <span>Tags ({data.nodes.filter(n => n.group === 'tag').length})</span>
        </div>
      </div>
      
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeLabel="name"
          nodeColor={(node: any) => node.group === 'note' ? '#4ade80' : '#60a5fa'}
          nodeVal={(node: any) => node.val}
          linkColor={() => '#4b5563'}
          linkWidth={1}
          onNodeClick={handleNodeClick}
          d3VelocityDecay={0.3}
          cooldownTicks={100}
        />
      )}
    </div>
  );
}
