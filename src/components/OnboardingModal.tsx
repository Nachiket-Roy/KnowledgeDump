import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [apiKey, setApiKey] = useState('');

  const handleFinish = async () => {
    if (apiKey) {
      try {
        await invoke('set_setting', { key: 'gemini_api_key', value: apiKey });
      } catch (e) {
        console.error('Failed to save API key:', e);
      }
    }
    // Mark as onboarded
    try {
      await invoke('set_setting', { key: 'has_onboarded', value: 'true' });
    } catch (e) {
      console.error('Failed to mark onboarded:', e);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="text-3xl font-bold text-gray-100 mb-2">Welcome to KnowledgeDump</h2>
        <p className="text-gray-400 mb-6 text-sm">Your AI-powered personal knowledge base.</p>

        <div className="space-y-4 mb-8">
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
              <p className="text-sm text-gray-500">Concepts are automatically extracted as you write.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-xl">🕸️</div>
            <div>
              <h3 className="font-semibold text-gray-200">Knowledge Graph</h3>
              <p className="text-sm text-gray-500">Visualize the connections between your notes natively.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 mb-6">
          <label className="block text-sm font-medium text-blue-400 mb-2">
            Set Gemini API Key (Recommended)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key here..."
            className="w-full bg-gray-800 border border-gray-600 rounded p-2.5 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors mb-2"
          />
          <p className="text-xs text-gray-500">
            You can also skip this and set it later in Settings, or use local Ollama instead.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
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
