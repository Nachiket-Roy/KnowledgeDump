import { invoke } from '@tauri-apps/api/core';
import { Ollama } from 'ollama/browser';

export async function generateAiDescription(query: string, chunkContent: string): Promise<string> {
  const prompt = `Explain why the following text matches the user's search query in exactly 1-2 short sentences.
Query: "${query}"
Text: "${chunkContent}"`;

  try {
    const description = await invoke<string>('generate_gemini_description', { prompt });
    if (description) return description;
  } catch (error) {
    console.warn('Gemini API failed or key missing, falling back to local Ollama', error);
  }

  try {
    const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
    });
    if (response.message?.content) return response.message.content;
  } catch (error) {
    console.error('Ollama fallback failed. Ensure Ollama is running locally.', error);
  }

  return "No AI description available. Please configure Gemini or start Ollama.";
}
