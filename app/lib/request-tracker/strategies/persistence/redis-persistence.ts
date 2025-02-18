import Redis from 'ioredis';

export class RedisPersistence {
  private client: Redis;

  constructor(config = { host: 'localhost', port: 6379 }) {
    this.client = new Redis(config);
  }

  async add(provider: string, requestId: string, expirationTime = 3600): Promise<boolean> {
    const key = `request:${provider}:${requestId}`;
    const result = await this.client.set(key, 'true', 'EX', expirationTime, 'NX');
    return result === 'OK';
  }

  async has(provider: string, requestId: string): Promise<boolean> {
    const key = `request:${provider}:${requestId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}
