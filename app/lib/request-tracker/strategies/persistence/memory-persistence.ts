export class MemoryPersistence {
  private requestCache = new Map<string, Set<string>>();
  private MAX_CACHE_SIZE: number;

  constructor(maxCacheSize = 1000) {
    this.MAX_CACHE_SIZE = maxCacheSize;
  }

  add(provider: string, requestId: string): boolean {
    let providerCache = this.requestCache.get(provider);
    
    if (!providerCache) {
      providerCache = new Set();
      this.requestCache.set(provider, providerCache);
    }

    if (providerCache.has(requestId)) return false;

    if (providerCache.size >= this.MAX_CACHE_SIZE) {
      const oldestRequest = providerCache.values().next().value;
      providerCache.delete(oldestRequest);
    }

    providerCache.add(requestId);
    return true;
  }

  has(provider: string, requestId: string): boolean {
    return this.requestCache.get(provider)?.has(requestId) || false;
  }
}
