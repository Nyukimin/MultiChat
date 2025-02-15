import { AIProvider, ProviderConfig } from './ai-provider';
import { ProviderError, ErrorCode } from './provider-error';
import { ClaudeProvider } from '../claude/claude-provider';
import { GeminiProvider } from '../gemini/gemini-provider';
import { OllamaProvider } from '../ollama/ollama-provider';

export class ProviderFactory {
  private static providers = new Map<string, AIProvider>();

  static createProvider(type: string, config: ProviderConfig): AIProvider {
    const providerType = type.toLowerCase();
    const existingProvider = this.providers.get(providerType);
    
    if (existingProvider) {
      return existingProvider;
    }

    let provider: AIProvider;

    try {
      switch (providerType) {
        case 'claude':
          provider = new ClaudeProvider(config);
          break;
        case 'gemini':
          provider = new GeminiProvider(config);
          break;
        case 'ollama':
          provider = new OllamaProvider(config);
          break;
        default:
          throw new ProviderError(
            ErrorCode.CONFIGURATION_ERROR,
            `不明なプロバイダータイプです: ${type}`,
            'ProviderFactory'
          );
      }

      this.providers.set(providerType, provider);
      return provider;
    } catch (error) {
      if (error instanceof Error) {
        throw new ProviderError(
          ErrorCode.INITIALIZATION_ERROR,
          `プロバイダーの初期化に失敗しました: ${error.message}`,
          'ProviderFactory'
        );
      }
      throw error;
    }
  }

  static getProvider(type: string): AIProvider {
    const providerType = type.toLowerCase();
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        `プロバイダー '${type}' は初期化されていません`,
        'ProviderFactory'
      );
    }

    return provider;
  }
}
