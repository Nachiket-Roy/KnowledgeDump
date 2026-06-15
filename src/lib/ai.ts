import { GoogleGenAI } from '@google/genai';
import { Ollama } from 'ollama/browser';

export async function generateAiDescription(query: string, chunkContent: string): Promise<string> {
  const prompt = `Explain why the following text matches the user's search query in exactly 1-2 short sentences.
Query: "${query}"
Text: "${chunkContent}"`;

  try {
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      if (response.text) return response.text;
    }
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
