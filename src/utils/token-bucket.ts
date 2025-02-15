export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // トークン/ミリ秒

  constructor(capacity: number, refillRatePerMinute: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerMinute / (60 * 1000); // 1分あたりのレートをミリ秒に変換
    this.lastRefill = Date.now();
  }

  async waitForTokens(count: number = 1): Promise<void> {
    while (true) {
      this.refill();
      
      if (this.tokens >= count) {
        this.tokens -= count;
        return;
      }

      // 次のトークンが利用可能になるまでの待ち時間を計算
      const waitTime = Math.ceil((count - this.tokens) / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}
