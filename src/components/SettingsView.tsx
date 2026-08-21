import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { detectLocalProviders, LocalProvider } from '../lib/ai';
import { Settings as SettingsIcon, Cpu, Palette, Type, Check, RefreshCw } from 'lucide-react';

export function SettingsView() {
  const [providerName, setProviderName] = useState('Ollama');
  const [providerHost, setProviderHost] = useState('http://127.0.0.1:11434');
  const [providerModel, setProviderModel] = useState('llama3.2');
  const [providerType, setProviderType] = useState<'ollama' | 'openai'>('ollama');
  const [customHost, setCustomHost] = useState('');
  const [providers, setProviders] = useState<LocalProvider[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [theme, setTheme] = useState('dark');
  const [editorFont, setEditorFont] = useState('system');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
    scanProviders();
  }, []);

  const loadSettings = async () => {
    try {
      const name = await invoke<string | null>('get_setting', { key: 'ai_provider_name' });
      if (name) setProviderName(name);

      const host = await invoke<string | null>('get_setting', { key: 'ai_provider_host' });
      if (host) setProviderHost(host);

      const model = await invoke<string | null>('get_setting', { key: 'ai_provider_model' });
      if (model) setProviderModel(model);

      const pType = await invoke<string | null>('get_setting', { key: 'ai_provider_type' });
      if (pType) setProviderType(pType as 'ollama' | 'openai');

      const savedTheme = await invoke<string | null>('get_setting', { key: 'theme' });
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }

      const font = await invoke<string | null>('get_setting', { key: 'editor_font' });
      if (font) setEditorFont(font);

      const lineNums = await invoke<string | null>('get_setting', { key: 'show_line_numbers' });
      if (lineNums) setShowLineNumbers(lineNums === 'true');

      const autoTitle = await invoke<string | null>('get_setting', { key: 'auto_title_enabled' });
      if (autoTitle) setAutoTitleEnabled(autoTitle === 'true');
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const scanProviders = async (custom?: string) => {
    setIsScanning(true);
    try {
      const results = await detectLocalProviders(custom || customHost);
      setProviders(results);
    } catch (e) {
      console.error('Failed to scan providers:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectTheme = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  const handleSave = async () => {
    try {
      await invoke('set_setting', { key: 'ai_provider_name', value: providerName });
      await invoke('set_setting', { key: 'ai_provider_host', value: providerHost });
      await invoke('set_setting', { key: 'ai_provider_model', value: providerModel });
      await invoke('set_setting', { key: 'ai_provider_type', value: providerType });
      await invoke('set_setting', { key: 'theme', value: theme });
      await invoke('set_setting', { key: 'editor_font', value: editorFont });
      await invoke('set_setting', { key: 'show_line_numbers', value: showLineNumbers.toString() });
      await invoke('set_setting', { key: 'auto_title_enabled', value: autoTitleEnabled.toString() });
      setSavedStatus('saved');
      setTimeout(() => setSavedStatus('idle'), 2500);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSavedStatus('error');
    }
  };

  const currentProviderObj = providers.find(p => p.host === providerHost);

  return (
    <div className="flex-1 bg-theme-bg h-screen overflow-auto text-theme-text p-8">
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-3 border-b border-theme-border/60 pb-4">
          <div className="w-10 h-10 rounded-xl bg-theme-accent/15 border border-theme-accent/40 flex items-center justify-center text-theme-accent glass-glow">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
            <p className="text-xs opacity-75 font-mono">Configure local AI providers, appearance palettes, and editor parameters.</p>
          </div>
        </div>
        
        {/* Local AI Configuration */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Cpu size={18} className="text-theme-accent" />
              Local AI Engine
            </h2>
            <button
              type="button"
              onClick={() => scanProviders()}
              disabled={isScanning}
              className="text-xs px-3 py-1.5 bg-theme-input border border-theme-border hover:border-theme-accent rounded-lg transition-colors flex items-center gap-1.5 font-mono disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Scan Endpoints'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5">
            {providers.map(p => (
              <button
                key={p.host}
                type="button"
                aria-pressed={providerHost === p.host}
                onClick={() => {
                  setProviderName(p.name);
                  setProviderHost(p.host);
                  setProviderType(p.type);
                  if (p.models.length > 0) setProviderModel(p.models[0]);
                }}
                className={`p-3 rounded-lg border text-xs text-left transition-all ${
                  providerHost === p.host
                    ? 'border-theme-accent bg-theme-accent/10 glass-glow'
                    : 'border-theme-border bg-theme-input/40 opacity-80 hover:opacity-100 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{p.name}</span>
                  <span className="sr-only">{p.status === 'online' ? 'Online' : 'Offline'}</span>
                  <span aria-hidden="true" className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-400 glass-glow' : 'bg-red-500'}`} />
                </div>
                <div className="text-[11px] font-mono opacity-75 truncate">{p.host}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="setting-provider-host" className="block text-xs font-mono font-medium opacity-80 mb-1">Active Host URL</label>
              <input
                id="setting-provider-host"
                type="text"
                value={providerHost}
                onChange={e => setProviderHost(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full glass-input rounded-lg p-2.5 text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label htmlFor="setting-provider-model" className="block text-xs font-mono font-medium opacity-80 mb-1">Active Model</label>
              {currentProviderObj?.status === 'online' && currentProviderObj.models.length > 0 ? (
                <select
                  id="setting-provider-model"
                  value={providerModel}
                  onChange={e => setProviderModel(e.target.value)}
                  className="w-full glass-input rounded-lg p-2.5 text-xs font-mono outline-none"
                >
                  {currentProviderObj.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="setting-provider-model"
                  type="text"
                  value={providerModel}
                  onChange={e => setProviderModel(e.target.value)}
                  placeholder="llama3.2"
                  className="w-full glass-input rounded-lg p-2.5 text-xs font-mono outline-none"
                />
              )}
            </div>
          </div>

          <div className="pt-2">
            <label htmlFor="setting-custom-host" className="block text-xs font-mono opacity-75 mb-1">Custom Endpoint (e.g. llamafile, remote node)</label>
            <div className="flex gap-2">
              <input
                id="setting-custom-host"
                type="text"
                value={customHost}
                onChange={e => setCustomHost(e.target.value)}
                placeholder="http://127.0.0.1:8080"
                className="flex-1 glass-input rounded-lg p-2 text-xs font-mono outline-none"
              />
              <button
                type="button"
                onClick={() => scanProviders(customHost)}
                className="text-xs px-3 py-1.5 bg-theme-accent/20 border border-theme-accent/40 text-theme-accent font-mono font-medium rounded-lg hover:bg-theme-accent/30 transition-all"
              >
                Probe Host
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-theme-border/60 flex items-center justify-between">
            <div>
              <label htmlFor="setting-auto-title" className="block text-sm font-medium">Auto-Title Notes</label>
              <p className="text-xs opacity-75 font-mono">Automatically generate title for "New Note"s using local AI.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input id="setting-auto-title" type="checkbox" className="sr-only peer" checked={autoTitleEnabled} onChange={() => setAutoTitleEnabled(!autoTitleEnabled)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent"></div>
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette size={18} className="text-theme-accent" />
            Appearance & Themes
          </h2>
          
          <div>
            <label className="block text-xs font-mono font-medium opacity-80 mb-2">Theme Palette</label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'dark', label: 'Dark Space', bg: '#0e0e10', accent: '#00f0ff' },
                { id: 'light', label: 'Light Clean', bg: '#ffffff', accent: '#0284c7' },
                { id: 'sepia', label: 'Warm Sepia', bg: '#faf4e8', accent: '#b45309' },
                { id: 'dracula', label: 'Dracula', bg: '#282a36', accent: '#bd93f9' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={theme === t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`p-3 rounded-lg border text-left transition-all relative ${
                    theme === t.id ? 'border-theme-accent ring-1 ring-theme-accent glass-glow' : 'border-theme-border hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: t.bg }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: t.id === 'light' || t.id === 'sepia' ? '#333' : '#fff' }}>{t.label}</span>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Settings */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Type size={18} className="text-theme-accent" />
            Editor Typography
          </h2>

          <div>
            <label htmlFor="setting-editor-font" className="block text-xs font-mono font-medium opacity-80 mb-2">Font Family</label>
            <select
              id="setting-editor-font"
              value={editorFont}
              onChange={e => setEditorFont(e.target.value)}
              className="w-full glass-input rounded-lg p-2.5 text-xs font-mono outline-none"
            >
              <option value="system">System Default</option>
              <option value="inter">Inter (Sans-Serif)</option>
              <option value="roboto">Roboto</option>
              <option value="fira-code">Fira Code (Monospace)</option>
              <option value="jetbrains-mono">JetBrains Mono</option>
              <option value="source-code-pro">Source Code Pro</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <label htmlFor="setting-line-numbers" className="block text-sm font-medium">Show Line Numbers</label>
              <p className="text-xs opacity-75 font-mono">Display line numbers in CodeMirror gutter.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input id="setting-line-numbers" type="checkbox" className="sr-only peer" checked={showLineNumbers} onChange={() => setShowLineNumbers(!showLineNumbers)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent"></div>
            </label>
          </div>
        </div>
        
        {savedStatus === 'error' && (
          <div role="alert" className="p-3 bg-red-950/40 border border-red-800/50 text-red-300 text-xs rounded-lg font-mono">
            Error saving settings to local SQLite database. Please try again.
          </div>
        )}

        <div aria-live="polite">
          <button
            type="button"
            onClick={handleSave}
            className={`px-6 py-3 font-semibold rounded-xl shadow-lg transition-all w-full flex items-center justify-center gap-2 ${
              savedStatus === 'saved'
                ? 'bg-green-600 text-white glass-glow'
                : savedStatus === 'error'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-theme-accent text-gray-950 hover:opacity-90 glass-glow'
            }`}
          >
            {savedStatus === 'saved' ? (
              <>
                <Check size={16} />
                <span>Settings Saved Successfully</span>
              </>
            ) : (
              <span>Save All Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
