import { invoke } from '@tauri-apps/api/core';
import { Ollama } from 'ollama/browser';

export async function generateAiDescription(query: string, chunkContent: string): Promise<string> {
  const prompt = `Explain why the following text matches the user's search query in exactly 1-2 short sentences.
Query: "${query}"
Text: "${chunkContent}"`;

  try {
    const description = await Promise.race([
      invoke<string>('generate_gemini_description', { prompt }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini invoke timeout')), 5000)
      ),
    ]);
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

export async function extractTags(content: string): Promise<string[]> {
  const prompt = `Extract 1 to 4 highly relevant, short concept tags from the following text. 
Return ONLY a valid JSON array of strings, with absolutely no other text, no markdown formatting, and no explanation.
Example output: ["React", "State Management", "Hooks"]
Text: "${content}"`;

  let jsonResponse = "";

  try {
    const description = await Promise.race([
      invoke<string>('generate_gemini_description', { prompt }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini invoke timeout')), 5000)
      ),
    ]);
    if (description) {
      jsonResponse = description;
    }
  } catch (error) {
    console.warn('Gemini tag extraction failed, falling back to local Ollama', error);
  }

  if (!jsonResponse) {
    try {
      const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
      const response = await ollama.chat({
        model: 'llama3',
        messages: [{ role: 'user', content: prompt }],
      });
      if (response.message?.content) {
        jsonResponse = response.message.content;
      }
    } catch (error) {
      console.error('Ollama fallback failed for tags.', error);
      return [];
    }
  }

  // Robust JSON extraction to handle markdown wrappers
  try {
    const match = jsonResponse.match(/\[.*?\]/s);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => typeof item === 'string')
          .slice(0, 4);
      }
    }
  } catch (e) {
    console.error("Failed to parse tags JSON:", e, jsonResponse);
  }

  return [];
}
