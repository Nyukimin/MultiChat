import { v4 as uuidv4 } from 'uuid';

const pendingRequests = new Map<string, AbortController>();

export const safeFetch = async (url: string, options: RequestInit = {}) => {
  const requestId = uuidv4();
  const controller = new AbortController();
  
  // 重複リクエストチェック
  if (pendingRequests.has(requestId)) {
    pendingRequests.get(requestId)?.abort();
  }

  pendingRequests.set(requestId, controller);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        'X-Request-ID': requestId
      }
    });

    if (!response.ok) throw new Error('Request failed');
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted');
    }
    throw error;
  } finally {
    pendingRequests.delete(requestId);
  }
};

export const chatFetch = async (message: string) => {
  return safeFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
};
