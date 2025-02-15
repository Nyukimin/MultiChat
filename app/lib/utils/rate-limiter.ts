interface RateLimiterOptions {
  requestsPerMinute: number;
  maxConcurrent: number;
}

export class RateLimiter {
  private requestsPerMinute: number;
  private maxConcurrent: number;
  private requestTimes: number[];
  private currentRequests: number;

  constructor(options: RateLimiterOptions) {
    this.requestsPerMinute = options.requestsPerMinute;
    this.maxConcurrent = options.maxConcurrent;
    this.requestTimes = [];
    this.currentRequests = 0;
  }

  private cleanOldRequests() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
  }

  async acquire(): Promise<boolean> {
    this.cleanOldRequests();

    if (
      this.requestTimes.length >= this.requestsPerMinute ||
      this.currentRequests >= this.maxConcurrent
    ) {
      return false;
    }

    this.requestTimes.push(Date.now());
    this.currentRequests++;
    return true;
  }

  release() {
    this.currentRequests = Math.max(0, this.currentRequests - 1);
  }
}
