import { LLMClientFactory } from '../../app/lib/ai_clients/factory';
import { BaseLLMClientFactory, LLMClientError } from '../../app/lib/ai_clients/factory.base';
import { AnthropicClient } from '../../app/lib/ai_clients/anthropic';
import { LLMType } from '../../app/lib/types/ai';
import * as fs from 'fs';
import * as path from 'path';

// モックの設定
jest.mock('../../app/lib/ai_clients/anthropic');
jest.mock('../../app/lib/utils/errorLogger', () => ({
  ErrorLogger: {
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('LLMClientFactory', () => {
  const logDir = path.join(process.cwd(), 'logs');
  let mockAnthropicClient: jest.Mocked<AnthropicClient>;

  beforeEach(() => {
    // テスト前の初期化
    jest.clearAllMocks();
    LLMClientFactory.resetInstance();
    
    // モックの設定
    mockAnthropicClient = {
      generate: jest.fn().mockResolvedValue({
        content: 'test response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      })
    } as any;

    (AnthropicClient as jest.Mock).mockImplementation(() => mockAnthropicClient);

    // ログディレクトリのクリーンアップ
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true });
    }
  });

  describe('シングルトン動作検証', () => {
    it('同じタイプのクライアントで同一インスタンスを返すこと', async () => {
      const client1 = await LLMClientFactory.getInstance('anthropic');
      const client2 = await LLMClientFactory.getInstance('anthropic');
      expect(client1).toBe(client2);
      expect(AnthropicClient).toHaveBeenCalledTimes(1);
    });

    it('異なるタイプのクライアントでエラーをスローすること', async () => {
      await expect(LLMClientFactory.getInstance('unknown' as LLMType))
        .rejects.toThrow(LLMClientError);
    });
  });

  describe('インスタンス生成検証', () => {
    it('BaseLLMClientFactoryで新しいインスタンスを生成できること', async () => {
      const factory = new BaseLLMClientFactory();
      const client1 = await factory.createInstance('anthropic');
      const client2 = await factory.createInstance('anthropic');
      expect(client1).not.toBe(client2);
      expect(AnthropicClient).toHaveBeenCalledTimes(2);
    });

    it('不正なタイプでエラーをスローすること', async () => {
      const factory = new BaseLLMClientFactory();
      await expect(factory.createInstance('unknown' as LLMType))
        .rejects.toThrow(LLMClientError);
    });
  });

  describe('エラーハンドリング検証', () => {
    it('API初期化エラーを適切にハンドリングすること', async () => {
      const initError = new Error('API initialization failed');
      (AnthropicClient as jest.Mock).mockImplementationOnce(() => {
        throw initError;
      });

      await expect(LLMClientFactory.getInstance('anthropic'))
        .rejects.toThrow(LLMClientError);
    });

    it('API実行時エラーを適切にハンドリングすること', async () => {
      const client = await LLMClientFactory.getInstance('anthropic');
      mockAnthropicClient.generate.mockRejectedValueOnce(new Error('API execution failed'));

      await expect(client.generate({ role: 'user', content: 'test' }))
        .rejects.toThrow('API execution failed');
    });
  });

  describe('環境変数検証', () => {
    const originalEnv = process.env.ANTHROPIC_API_KEY;

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
    });

    afterEach(() => {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    });

    it('API_KEYが設定されていない場合にエラーをスローすること', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      await expect(LLMClientFactory.getInstance('anthropic'))
        .rejects.toThrow();
    });
  });
});
