import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { detectLocalProviders, LocalProvider } from '../lib/ai';
import { Sparkles, Cpu, Search, Tag as TagIcon, Network, Check } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [providers, setProviders] = useState<LocalProvider[]>([]);
  const [selectedProviderHost, setSelectedProviderHost] = useState<string>('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const [isScanning, setIsScanning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    scanProviders();
  }, []);

  const scanProviders = async () => {
    setIsScanning(true);
    try {
      const results = await detectLocalProviders();
      setProviders(results);
      const online = results.find(p => p.status === 'online');
      if (online) {
        setSelectedProviderHost(online.host);
        if (online.models.length > 0) {
          setSelectedModel(online.models[0]);
        }
      }
    } catch (e) {
      console.error('Failed to detect local providers:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFinish = async () => {
    setSaveError(null);
    const chosenProvider = providers.find(p => p.host === selectedProviderHost);
    const providerName = chosenProvider ? chosenProvider.name : 'Ollama';
    const providerType = chosenProvider ? chosenProvider.type : (selectedProviderHost.includes('11434') ? 'ollama' : 'openai');
    
    try {
      await invoke('set_setting', { key: 'ai_provider_name', value: providerName });
      await invoke('set_setting', { key: 'ai_provider_host', value: selectedProviderHost });
      await invoke('set_setting', { key: 'ai_provider_model', value: selectedModel || 'llama3.2' });
      await invoke('set_setting', { key: 'ai_provider_type', value: providerType });
      await invoke('set_setting', { key: 'has_onboarded', value: 'true' });
      onComplete();
    } catch (e: any) {
      console.error('Failed to save onboarding configuration:', e);
      setSaveError('Failed to save configuration. You can skip to continue.');
    }
  };

  const currentProviderObj = providers.find(p => p.host === selectedProviderHost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="glass-panel rounded-2xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden glass-glow">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-theme-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-theme-accent/15 border border-theme-accent/40 flex items-center justify-center text-theme-accent glass-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">KnowledgeDump</h2>
            <p className="text-xs text-gray-400 font-mono">Offline-First Local Knowledge Base</p>
          </div>
        </div>

        <div className="space-y-3.5 mb-6">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-theme-input/30 border border-theme-border/50">
            <Search className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-gray-200">Semantic Section Search</h3>
              <p className="text-[11px] text-gray-400 font-sans">Find exact note concepts with vector embeddings calculated on-device.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-theme-input/30 border border-theme-border/50">
            <TagIcon className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-gray-200">Local Auto-Tagging</h3>
              <p className="text-[11px] text-gray-400 font-sans">Concepts and tags are extracted seamlessly as you type.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-theme-input/30 border border-theme-border/50">
            <Network className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-gray-200">Interactive Knowledge Graph</h3>
              <p className="text-[11px] text-gray-400 font-sans">Visualize notes and connections in a 2D force graph.</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-theme-border mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-theme-accent">
              <Cpu size={14} />
              <span>Local AI Auto-Detection</span>
            </div>
            <button
              type="button"
              onClick={scanProviders}
              disabled={isScanning}
              className="text-[11px] font-mono px-2.5 py-1 bg-theme-input border border-theme-border hover:border-theme-accent rounded text-gray-200 disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Rescan'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {providers.map(p => (
              <button
                key={p.host}
                type="button"
                aria-pressed={selectedProviderHost === p.host}
                onClick={() => {
                  setSelectedProviderHost(p.host);
                  if (p.models.length > 0) setSelectedModel(p.models[0]);
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                  selectedProviderHost === p.host
                    ? 'border-theme-accent bg-theme-accent/15 text-white glass-glow'
                    : 'border-theme-border bg-theme-input/30 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{p.name}</span>
                  <span className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-400 glass-glow' : 'bg-red-500'}`} />
                </div>
                <div className="text-gray-400 text-[10px] font-mono truncate">{p.host}</div>
              </button>
            ))}
          </div>

          {currentProviderObj?.status === 'online' && currentProviderObj.models.length > 0 && (
            <div>
              <label className="block text-[11px] font-mono text-gray-300 mb-1">Active Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-xs font-mono text-gray-100 outline-none"
              >
                {currentProviderObj.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {!providers.some(p => p.status === 'online') && !isScanning && (
            <p className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/50">
              No local AI running. Install <a href="https://ollama.com" target="_blank" rel="noreferrer" className="underline text-theme-accent font-mono">Ollama</a> or launch LM Studio to enable AI features.
            </p>
          )}
        </div>

        {saveError && (
          <div className="mb-4 text-xs text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-800/50 flex items-center justify-between font-mono">
            <span>{saveError}</span>
            <button type="button" onClick={onComplete} className="text-gray-300 underline font-medium">Skip & Continue</button>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleFinish}
            className="px-6 py-2.5 bg-theme-accent text-gray-950 font-semibold text-xs rounded-xl transition-all glass-glow hover:opacity-90 flex items-center gap-1.5"
          >
            <Check size={15} />
            <span>Launch Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
