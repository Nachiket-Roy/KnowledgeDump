import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { detectLocalProviders, LocalProvider } from '../lib/ai';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="text-3xl font-bold text-gray-100 mb-2">Welcome to KnowledgeDump</h2>
        <p className="text-gray-400 mb-6 text-sm">Your offline-first, local AI-powered personal knowledge base.</p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-xl">✨</div>
            <div>
              <h3 className="font-semibold text-gray-200">Semantic Search</h3>
              <p className="text-sm text-gray-500">Find exactly the right section of your notes using natural language.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-xl">🏷️</div>
            <div>
              <h3 className="font-semibold text-gray-200">Auto-tagging</h3>
              <p className="text-sm text-gray-500">Concepts are automatically extracted locally as you write.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-xl">🕸️</div>
            <div>
              <h3 className="font-semibold text-gray-200">Knowledge Graph</h3>
              <p className="text-sm text-gray-500">Visualize connections between your notes natively.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-blue-400">
              Local AI Provider Setup
            </label>
            <button
              type="button"
              onClick={scanProviders}
              disabled={isScanning}
              className="text-xs px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 disabled:opacity-50"
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
                className={`p-2.5 rounded border text-xs text-left transition-all ${
                  selectedProviderHost === p.host
                    ? 'border-blue-500 bg-blue-900/30 text-white'
                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{p.name}</span>
                  <span className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-400' : 'bg-red-500'}`} />
                </div>
                <div className="text-gray-400 text-[10px] truncate">{p.host}</div>
              </button>
            ))}
          </div>

          {currentProviderObj?.status === 'online' && currentProviderObj.models.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-gray-100 outline-none"
              >
                {currentProviderObj.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {!providers.some(p => p.status === 'online') && !isScanning && (
            <p className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/50">
              No active local AI provider detected. Install <a href="https://ollama.com" target="_blank" rel="noreferrer" className="underline text-blue-400">Ollama</a> or start LM Studio/LocalAI/Jan to enable AI features. You can also configure a custom host later in Settings.
            </p>
          )}
        </div>

        {saveError && (
          <div className="mb-4 text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/50 flex items-center justify-between">
            <span>{saveError}</span>
            <button type="button" onClick={onComplete} className="text-gray-300 underline font-medium">Skip & Continue</button>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleFinish}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-blue-900/50"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
