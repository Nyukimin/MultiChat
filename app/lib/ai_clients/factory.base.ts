import { LLMType, LLMClient } from '../types/ai';
import { AnthropicClient } from './anthropic';
import { ErrorLogger } from '../utils/errorLogger';

// カスタムエラークラス
export class LLMClientError extends Error {
  constructor(message: string, public type: LLMType) {
    super(message);
    this.name = 'LLMClientError';
  }
}

// 基本的なファクトリークラス
export class BaseLLMClientFactory {
  protected clients: Map<LLMType, LLMClient>;

  constructor() {
    this.clients = new Map();
  }

  async createInstance(type: LLMType): Promise<LLMClient> {
    try {
      await this.validateEnvironment(type);
      switch (type) {
        case 'anthropic':
          return new AnthropicClient();
        default:
          throw new LLMClientError(`Unsupported LLM type: ${type}`, type);
      }
    } catch (error) {
      await ErrorLogger.logError(
        error as Error,
        __filename,
        [require.resolve('./anthropic')]
      );
      if (error instanceof LLMClientError) {
        throw error;
      }
      throw new LLMClientError(
        `Failed to create LLM client: ${(error as Error).message}`,
        type
      );
    }
  }

  protected async validateEnvironment(type: LLMType): Promise<void> {
    switch (type) {
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new LLMClientError('ANTHROPIC_API_KEY is not set', type);
        }
        break;
    }
  }
}
