import { TokenBucket } from './token-bucket';

export interface RateLimitConfig {
  requestsPerMinute: number;
  maxConcurrent: number;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private concurrentRequests: Map<string, number> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // 定期的なクリーンアップを設定
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * プロバイダーの設定を登録
   */
  registerProvider(providerId: string, config: RateLimitConfig): void {
    this.configs.set(providerId, config);
    this.buckets.set(
      providerId,
      new TokenBucket(config.maxConcurrent, config.requestsPerMinute)
    );
    this.concurrentRequests.set(providerId, 0);
  }

  /**
   * リクエストを実行（レート制限付き）
   */
  async schedule<T>(
    providerId: string,
    task: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const config = this.configs.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not registered with rate limiter`);
    }

    const bucket = this.buckets.get(providerId)!;
    const concurrent = this.concurrentRequests.get(providerId)!;

    if (concurrent >= config.maxConcurrent) {
      throw new Error(`Maximum concurrent requests reached for ${providerId}`);
    }

    try {
      // トークンを待機
      await Promise.race([
        bucket.waitForTokens(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Rate limit timeout')), timeoutMs)
        )
      ]);

      // 同時実行数をインクリメント
      this.concurrentRequests.set(providerId, concurrent + 1);

      // タスクを実行
      return await task();
    } finally {
      // 同時実行数をデクリメント
      const currentConcurrent = this.concurrentRequests.get(providerId)!;
      this.concurrentRequests.set(providerId, Math.max(0, currentConcurrent - 1));
    }
  }

  /**
   * プロバイダーの現在の状態を取得
   */
  getProviderStatus(providerId: string) {
    const bucket = this.buckets.get(providerId);
    const concurrent = this.concurrentRequests.get(providerId);
    const config = this.configs.get(providerId);

    if (!bucket || concurrent === undefined || !config) {
      throw new Error(`Provider ${providerId} not found`);
    }

    return {
      availableTokens: bucket.getAvailableTokens(),
      currentConcurrent: concurrent,
      maxConcurrent: config.maxConcurrent,
      requestsPerMinute: config.requestsPerMinute
    };
  }

  /**
   * 使用されていないプロバイダーのクリーンアップ
   */
  private cleanup(): void {
    for (const [providerId, concurrent] of this.concurrentRequests.entries()) {
      if (concurrent === 0) {
        const bucket = this.buckets.get(providerId);
        if (bucket?.getAvailableTokens() === this.configs.get(providerId)?.maxConcurrent) {
          // 未使用のプロバイダーを削除
          this.buckets.delete(providerId);
          this.concurrentRequests.delete(providerId);
          this.configs.delete(providerId);
        }
      }
    }
  }
}
