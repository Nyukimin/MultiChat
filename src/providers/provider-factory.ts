import { LLMProvider, ProviderConfig } from '../types/provider';
import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import { OllamaProvider } from './ollama-provider';
import { RateLimiter } from '../utils/rate-limiter';

export class ProviderFactory {
  private static providers = new Map<string, LLMProvider>();
  private static rateLimiter = new RateLimiter();

  static async createProvider(type: string, config: ProviderConfig): Promise<LLMProvider> {
    const existingProvider = this.providers.get(config.name);
    if (existingProvider) {
      return existingProvider;
    }

    // レートリミッターに登録
    this.rateLimiter.registerProvider(config.name, {
      requestsPerMinute: config.rateLimit.requestsPerMinute,
      maxConcurrent: config.rateLimit.maxConcurrent
    });

    let provider: LLMProvider;

    switch (type) {
      case 'anthropic':
        provider = new AnthropicProvider();
        break;
      case 'gemini':
        provider = new GeminiProvider();
        break;
      case 'ollama':
        provider = new OllamaProvider();
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    await provider.initialize(config);
    this.providers.set(config.name, provider);
    return provider;
  }

  static getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  static getAllProviders(): Map<string, LLMProvider> {
    return new Map(this.providers);
  }

  static getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}
