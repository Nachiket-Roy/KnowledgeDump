import { invoke } from '@tauri-apps/api/core';
import { Ollama } from 'ollama/browser';

export interface LocalProvider {
  name: string;
  host: string;
  detectUrl: string;
  models: string[];
  status: 'online' | 'offline';
  type: 'ollama' | 'openai';
}

export const KNOWN_PROVIDERS: Omit<LocalProvider, 'status' | 'models'>[] = [
  {
    name: 'Ollama',
    host: 'http://127.0.0.1:11434',
    detectUrl: 'http://127.0.0.1:11434/api/tags',
    type: 'ollama',
  },
  {
    name: 'LM Studio',
    host: 'http://127.0.0.1:1234',
    detectUrl: 'http://127.0.0.1:1234/v1/models',
    type: 'openai',
  },
  {
    name: 'LocalAI',
    host: 'http://127.0.0.1:8080',
    detectUrl: 'http://127.0.0.1:8080/v1/models',
    type: 'openai',
  },
  {
    name: 'Jan',
    host: 'http://127.0.0.1:1337',
    detectUrl: 'http://127.0.0.1:1337/v1/models',
    type: 'openai',
  },
];

export async function detectLocalProviders(customHost?: string): Promise<LocalProvider[]> {
  const PROBE_TIMEOUT_MS = 1000;
  
  const providersToProbe = [...KNOWN_PROVIDERS];
  if (customHost && !providersToProbe.some(p => p.host === customHost)) {
    const isOllamaPort = customHost.includes('11434');
    providersToProbe.push({
      name: 'Custom Provider',
      host: customHost,
      detectUrl: isOllamaPort ? `${customHost}/api/tags` : `${customHost}/v1/models`,
      type: isOllamaPort ? 'ollama' : 'openai',
    });
  }

  const probes = providersToProbe.map(async (provider): Promise<LocalProvider> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const resp = await fetch(provider.detectUrl, { signal: controller.signal });
      if (!resp.ok) {
        clearTimeout(timer);
        return { ...provider, models: [], status: 'offline' };
      }
      const data = await resp.json();
      clearTimeout(timer);
      const models = parseModels(provider.type, data);
      return { ...provider, models, status: 'online' };
    } catch {
      clearTimeout(timer);
      return { ...provider, models: [], status: 'offline' };
    }
  });

  const results = await Promise.allSettled(probes);
  return results
    .filter((r): r is PromiseFulfilledResult<LocalProvider> => r.status === 'fulfilled')
    .map(r => r.value);
}

function parseModels(type: 'ollama' | 'openai', data: any): string[] {
  try {
    if (type === 'ollama' && Array.isArray(data?.models)) {
      return data.models.map((m: any) => m.name || m.model).filter(Boolean);
    }
    if (type === 'openai' && Array.isArray(data?.data)) {
      return data.data.map((m: any) => m.id).filter(Boolean);
    }
  } catch (e) {
    console.warn('Failed to parse models:', e);
  }
  return [];
}

export async function getAiConfig(): Promise<{ host: string; model: string; providerName: string; providerType: 'ollama' | 'openai' }> {
  try {
    const [host, model, providerName, providerType] = await Promise.all([
      invoke<string | null>('get_setting', { key: 'ai_provider_host' }),
      invoke<string | null>('get_setting', { key: 'ai_provider_model' }),
      invoke<string | null>('get_setting', { key: 'ai_provider_name' }),
      invoke<string | null>('get_setting', { key: 'ai_provider_type' }),
    ]);

    const finalHost = host || 'http://127.0.0.1:11434';
    const finalType = (providerType as 'ollama' | 'openai') || (finalHost.includes('11434') || (providerName || '').toLowerCase() === 'ollama' ? 'ollama' : 'openai');

    return {
      host: finalHost,
      model: model || 'llama3.2',
      providerName: providerName || 'Ollama',
      providerType: finalType,
    };
  } catch {
    return {
      host: 'http://127.0.0.1:11434',
      model: 'llama3.2',
      providerName: 'Ollama',
      providerType: 'ollama',
    };
  }
}

export async function callLocalAi(prompt: string): Promise<string> {
  const { host, model, providerType } = await getAiConfig();
  const REQUEST_TIMEOUT_MS = 15000;

  if (providerType === 'ollama') {
    const ollama = new Ollama({ host });
    const chatPromise = ollama.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ollama request timed out after 15s')), REQUEST_TIMEOUT_MS)
    );

    const response = await Promise.race([chatPromise, timeoutPromise]);
    if (response.message?.content) {
      return response.message.content;
    }
    throw new Error('Empty response from Ollama');
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(`${host.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error(`Local AI request failed: ${resp.statusText}`);
      }
      const data = await resp.json();
      clearTimeout(timer);
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      throw new Error('Empty response from OpenAI-compatible provider');
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }
}

export async function generateAiDescription(query: string, chunkContent: string): Promise<string> {
  const prompt = `Explain why the following text matches the user's search query in exactly 1-2 short sentences.
Query: "${query}"
Text: "${chunkContent}"`;

  try {
    const description = await callLocalAi(prompt);
    if (description) return description;
  } catch (error) {
    console.error('Local AI failed to generate description:', error);
  }

  return "No AI description available. Start Ollama or another local LLM provider.";
}

export async function extractTags(content: string): Promise<string[]> {
  const prompt = `Extract 1 to 4 highly relevant, short concept tags from the following text. 
Return ONLY a valid JSON array of strings, with absolutely no other text, no markdown formatting, and no explanation.
Example output: ["React", "State Management", "Hooks"]
Text: "${content}"`;

  let jsonResponse = "";

  try {
    jsonResponse = await callLocalAi(prompt);
  } catch (error) {
    console.error('Local AI tag extraction failed:', error);
    return [];
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

export async function generateTitle(content: string): Promise<string> {
  if (content.trim().length < 10) return "New Note";

  const prompt = `Generate a very short, 2 to 4 word title for the following text. Return ONLY the title, with no quotes, no markdown, and no explanation.
Text: "${content.substring(0, 1000)}"`;

  try {
    const title = await callLocalAi(prompt);
    if (title) {
      return title.trim().replace(/^"|"$/g, '');
    }
  } catch (error) {
    console.error('Local AI title generation failed:', error);
  }

  return "New Note";
}
