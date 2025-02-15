import { AIProvider } from './ai-provider';
import { ProviderError, ErrorCode } from './provider-error';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, AIProvider>();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  registerProvider(name: string, provider: AIProvider): void {
    if (this.providers.has(name)) {
      throw new ProviderError(
        ErrorCode.INITIALIZATION_ERROR,
        `Provider ${name} is already registered`,
        'ProviderRegistry'
      );
    }
    this.providers.set(name, provider);
  }

  getProvider(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderError(
        ErrorCode.INITIALIZATION_ERROR,
        `Provider ${name} is not registered`,
        'ProviderRegistry'
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
