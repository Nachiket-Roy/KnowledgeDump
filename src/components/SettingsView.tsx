import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key = await invoke<string | null>('get_setting', { key: 'gemini_api_key' });
      if (key) setApiKey(key);
      
      const lineNums = await invoke<string | null>('get_setting', { key: 'show_line_numbers' });
      if (lineNums) setShowLineNumbers(lineNums === 'true');
      
      const autoTitle = await invoke<string | null>('get_setting', { key: 'auto_title_enabled' });
      if (autoTitle) setAutoTitleEnabled(autoTitle === 'true');
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleSave = async () => {
    try {
      await invoke('set_setting', { key: 'gemini_api_key', value: apiKey });
      await invoke('set_setting', { key: 'show_line_numbers', value: showLineNumbers.toString() });
      await invoke('set_setting', { key: 'auto_title_enabled', value: autoTitleEnabled.toString() });
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

          <div className="mb-4 pt-4 border-t border-theme-border flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-200">
                Auto-Title AI
              </label>
              <p className="text-xs text-gray-500">
                Automatically generate a 2-4 word title for "New Note"s based on their content.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={autoTitleEnabled} onChange={() => setAutoTitleEnabled(!autoTitleEnabled)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent"></div>
            </label>
          </div>
        </div>

        <div className="bg-theme-sidebar rounded-lg border border-theme-border p-6 mb-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-theme-accent">Editor Settings</h2>
          
          <div className="mb-4 flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-200">
                Show Line Numbers
              </label>
              <p className="text-xs text-gray-500">
                Display line numbers in the left gutter of the markdown editor.
              </p>
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
