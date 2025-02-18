import { RequestTrackerConfig, defaultConfig } from './config/request-tracker-config';
import { MemoryPersistence } from './strategies/persistence/memory-persistence';
import { RedisPersistence } from './strategies/persistence/redis-persistence';
import { CryptoIdGenerator } from './strategies/id-generator/crypto-id-generator';
import { ConsoleLogger } from './logger/console-logger';
import { LogLevel } from './logger/logger-interface';

export class RequestTracker {
  private config: RequestTrackerConfig;
  private persistence: MemoryPersistence | RedisPersistence;
  private logger: ConsoleLogger;

  constructor(config: RequestTrackerConfig = {}) {
    this.config = { ...defaultConfig, ...config };
    this.logger = new ConsoleLogger(
      this.config.logLevel === 'debug' ? LogLevel.DEBUG : 
      this.config.logLevel === 'warn' ? LogLevel.WARN : 
      this.config.logLevel === 'error' ? LogLevel.ERROR : 
      LogLevel.INFO
    );

    // 永続化戦略の選択
    this.persistence = this.config.persistenceStrategy === 'redis'
      ? new RedisPersistence()
      : new MemoryPersistence(this.config.maxRequests);
  }

  async trackRequest(provider: string, requestId?: string): Promise<string> {
    // リクエストIDの生成
    const finalRequestId = requestId || CryptoIdGenerator.generate(provider);

    try {
      // 重複チェック
      const isDuplicate = this.persistence.has(provider, finalRequestId);
      
      if (isDuplicate) {
        this.logger.warn('重複リクエストを検出', { 
          provider, 
          requestId: finalRequestId 
        });
        throw new Error('重複リクエスト');
      }

      // リクエストの保存
      this.persistence.add(provider, finalRequestId);

      this.logger.info('リクエストを追跡', { 
        provider, 
        requestId: finalRequestId 
      });

      return finalRequestId;
    } catch (error) {
      this.logger.error('リクエスト追跡に失敗', { 
        provider, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

export const requestTracker = new RequestTracker();
