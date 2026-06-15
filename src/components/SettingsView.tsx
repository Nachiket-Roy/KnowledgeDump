import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key = await invoke<string | null>('get_setting', { key: 'gemini_api_key' });
      if (key) {
        setApiKey(key);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleSave = async () => {
    try {
      await invoke('set_setting', { key: 'gemini_api_key', value: apiKey });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <div className="flex-1 bg-theme-bg h-screen overflow-auto text-gray-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-100">Settings</h1>
        
        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 mb-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-theme-accent">AI Configuration</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-theme-input border border-theme-border rounded p-2.5 text-gray-100 focus:outline-none focus:border-theme-accent transition-colors"
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for generating high-quality section summaries and extracting concept tags. 
              If left blank, the app will attempt to fallback to a local Ollama instance running on port 11434.
            </p>
          </div>
          
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-theme-accent/80 hover:bg-theme-accent text-white font-medium rounded transition-colors"
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 shadow-xl opacity-60">
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Appearance (Coming Soon)</h2>
          <div className="text-sm text-gray-500">
            Theme selection and font size controls will be added in a future update.
          </div>
        </div>
      </div>
    </div>
  );
}
