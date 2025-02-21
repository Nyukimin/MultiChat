export class TokenStats {
  private startTime: number;
  private totalTokens: number;

  constructor() {
    this.startTime = Date.now();
    this.totalTokens = 0;
  }

  updateTokenCount(tokens: number): void {
    this.totalTokens = tokens;
  }

  getTokensPerSecond(): number {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    return this.totalTokens / elapsedSeconds;
  }

  reset(): void {
    this.startTime = Date.now();
    this.totalTokens = 0;
  }
}
