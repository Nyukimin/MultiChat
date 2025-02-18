import { randomBytes } from 'crypto';

export class CryptoIdGenerator {
  static generate(provider: string): string {
    const timestamp = Date.now();
    const randomPart = randomBytes(16).toString('hex');
    return `${provider}_${timestamp}_${randomPart}`;
  }
}
