import { pipeline, env } from '@xenova/transformers';

// Enable browser caching for the model
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;

async function getInstance() {
  if (!extractor) {
    // Clear the corrupted cache from the previous local models bug
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    } catch (e) {
      console.warn("Could not clear cache", e);
    }

    extractor = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (info: any) => {
        self.postMessage({ status: 'progress', data: info });
      }
    });
  }
  return await extractor;
}

self.addEventListener('message', async (event) => {
  const { id, text } = event.data;
  
  try {
    if (text === undefined) {
        // Initialize model without processing text
        await getInstance();
        self.postMessage({ status: 'ready', id });
        return;
    }

    const ext = await getInstance();
    const output = await ext(text, { pooling: 'mean', normalize: true });
    
    // Convert Tensor to standard Array
    const vector = Array.from(output.data);
    
    self.postMessage({ 
      status: 'complete', 
      id, 
      vector 
    });
  } catch (error: any) {
    self.postMessage({ status: 'error', id, error: error.message });
  }
});
