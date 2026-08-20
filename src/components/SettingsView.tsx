import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { detectLocalProviders, LocalProvider } from '../lib/ai';

export function SettingsView() {
  const [providerName, setProviderName] = useState('Ollama');
  const [providerHost, setProviderHost] = useState('http://127.0.0.1:11434');
  const [providerModel, setProviderModel] = useState('llama3.2');
  const [customHost, setCustomHost] = useState('');
  const [providers, setProviders] = useState<LocalProvider[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [theme, setTheme] = useState('dark');
  const [editorFont, setEditorFont] = useState('system');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

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
      await invoke('set_setting', { key: 'theme', value: theme });
      await invoke('set_setting', { key: 'editor_font', value: editorFont });
      await invoke('set_setting', { key: 'show_line_numbers', value: showLineNumbers.toString() });
      await invoke('set_setting', { key: 'auto_title_enabled', value: autoTitleEnabled.toString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const currentProviderObj = providers.find(p => p.host === providerHost);

  return (
    <div className="flex-1 bg-theme-bg h-screen overflow-auto text-gray-200 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-100">Settings</h1>
        
        {/* Local AI Configuration */}
        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-theme-accent">Local AI Configuration</h2>
            <button
              onClick={() => scanProviders()}
              disabled={isScanning}
              className="text-xs px-3 py-1.5 bg-theme-input border border-theme-border hover:bg-theme-bg rounded text-gray-200 transition-colors disabled:opacity-50"
            >
              {isScanning ? 'Scanning Providers...' : 'Scan Providers'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {providers.map(p => (
              <div
                key={p.host}
                onClick={() => {
                  setProviderName(p.name);
                  setProviderHost(p.host);
                  if (p.models.length > 0) setProviderModel(p.models[0]);
                }}
                className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                  providerHost === p.host
                    ? 'border-theme-accent bg-theme-accent/10 text-white'
                    : 'border-theme-border bg-theme-input/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{p.name}</span>
                  <span className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-400' : 'bg-red-500'}`} />
                </div>
                <div className="text-[11px] opacity-75 truncate">{p.host}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Active Host</label>
              <input
                type="text"
                value={providerHost}
                onChange={e => setProviderHost(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full bg-theme-input border border-theme-border rounded p-2 text-sm text-gray-100 focus:outline-none focus:border-theme-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Active Model</label>
              {currentProviderObj?.status === 'online' && currentProviderObj.models.length > 0 ? (
                <select
                  value={providerModel}
                  onChange={e => setProviderModel(e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded p-2 text-sm text-gray-100 outline-none focus:border-theme-accent"
                >
                  {currentProviderObj.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={providerModel}
                  onChange={e => setProviderModel(e.target.value)}
                  placeholder="llama3.2"
                  className="w-full bg-theme-input border border-theme-border rounded p-2 text-sm text-gray-100 focus:outline-none focus:border-theme-accent"
                />
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Custom Host (e.g. llamafile, remote host)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customHost}
                onChange={e => setCustomHost(e.target.value)}
                placeholder="http://127.0.0.1:8080"
                className="flex-1 bg-theme-input border border-theme-border rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-theme-accent"
              />
              <button
                onClick={() => scanProviders(customHost)}
                className="text-xs px-3 py-1 bg-theme-accent text-white rounded hover:opacity-90 transition-opacity"
              >
                Add & Probe
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-theme-border flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-200">Auto-Title AI</label>
              <p className="text-xs text-gray-500">Automatically title "New Note"s using local AI.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={autoTitleEnabled} onChange={() => setAutoTitleEnabled(!autoTitleEnabled)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent"></div>
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 shadow-xl space-y-4">
          <h2 className="text-xl font-semibold text-theme-accent">Appearance</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme Palette</label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'dark', label: 'Dark', bg: '#272727', accent: '#60cdff' },
                { id: 'light', label: 'Light', bg: '#ffffff', accent: '#2563eb' },
                { id: 'sepia', label: 'Sepia', bg: '#faf4e8', accent: '#b45309' },
                { id: 'dracula', label: 'Dracula', bg: '#282a36', accent: '#bd93f9' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`p-3 rounded border text-left transition-all ${
                    theme === t.id ? 'border-theme-accent ring-1 ring-theme-accent' : 'border-theme-border'
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
        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 shadow-xl space-y-4">
          <h2 className="text-xl font-semibold text-theme-accent">Editor Settings</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Editor Font</label>
            <select
              value={editorFont}
              onChange={e => setEditorFont(e.target.value)}
              className="w-full bg-theme-input border border-theme-border rounded p-2 text-sm text-gray-100 outline-none focus:border-theme-accent"
            >
              <option value="system">System Default</option>
              <option value="inter">Inter</option>
              <option value="roboto">Roboto</option>
              <option value="fira-code">Fira Code</option>
              <option value="jetbrains-mono">JetBrains Mono</option>
              <option value="source-code-pro">Source Code Pro</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-200">Show Line Numbers</label>
              <p className="text-xs text-gray-500">Display line numbers in the editor gutter.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={showLineNumbers} onChange={() => setShowLineNumbers(!showLineNumbers)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent"></div>
            </label>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-theme-accent hover:bg-theme-accentHover text-white font-medium rounded shadow-lg transition-colors w-full"
        >
          {saved ? 'Settings Saved!' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
