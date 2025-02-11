import { LLMType, LLMClient } from '../types/ai';
import { BaseLLMClientFactory, LLMClientError } from './factory.base';
import { ErrorLogger } from '../utils/errorLogger';

// サーバーサイド用のシングルトンファクトリ
export class LLMClientFactory extends BaseLLMClientFactory {
  private static instance: LLMClientFactory;
  private static instances = new Map<LLMType, LLMClient>();

  private constructor() {
    super();
  }

  static async getInstance(type: LLMType): Promise<LLMClient> {
    try {
      if (!this.instance) {
        this.instance = new LLMClientFactory();
      }

      if (!this.instances.has(type)) {
        const client = await this.instance.createInstance(type);
        this.instances.set(type, client);
      }

      return this.instances.get(type)!;
    } catch (error) {
      await ErrorLogger.logError(
        error as Error,
        __filename,
        [
          require.resolve('./factory.base'),
          require.resolve('./anthropic')
        ]
      );
      if (error instanceof LLMClientError) {
        throw error;
      }
      throw new LLMClientError(
        `Failed to get LLM client instance: ${(error as Error).message}`,
        type
      );
    }
  }

  // サーバーアクション用のラッパー関数
  static getClient(type: LLMType): Promise<LLMClient> {
    return this.getInstance(type);
  }
}
