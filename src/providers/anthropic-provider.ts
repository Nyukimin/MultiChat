import { Anthropic } from '@anthropic-ai/sdk';
import { LLMProvider, ProviderConfig, ProviderHealth } from '../types/provider';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private config: ProviderConfig | null = null;
  private health: ProviderHealth = {
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    lastChecked: new Date()
  };

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.client = new Anthropic({
      apiKey: process.env[config.parameters.apiKeyEnv] || ''
    });
  }

  async *generate(prompt: string, params?: Record<string, any>): AsyncIterable<string> {
    if (!this.client || !this.config) {
      throw new Error('Provider not initialized');
    }

    const startTime = Date.now();
    
    try {
      const stream = await this.client.messages.create({
        model: params?.model || this.config.parameters.model || 'claude-3-opus-20240229',
        max_tokens: params?.maxTokens || this.config.parameters.maxTokens || 1024,
        temperature: params?.temperature || this.config.parameters.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true
      });

      for await (const message of stream) {
        if (message.type === 'content_block_delta' && message.delta.text) {
          yield message.delta.text;
        }
      }

      // ヘルスメトリクスの更新
      this.updateHealth(Date.now() - startTime, false);
    } catch (error) {
      this.updateHealth(Date.now() - startTime, true);
      throw error;
    }
  }

  private updateHealth(latency: number, hasError: boolean): void {
    const now = new Date();
    const timeDiff = now - this.health.lastChecked.getTime();
    
    // エラー率の計算（直近1分間）
    if (timeDiff > 60000) {
      this.health.errorRate = hasError ? 1 : 0;
    } else {
      this.health.errorRate = (this.health.errorRate * 0.8) + (hasError ? 0.2 : 0);
    }

    // レイテンシーの更新（指数移動平均）
    this.health.latency = (this.health.latency * 0.8) + (latency * 0.2);
    this.health.lastChecked = new Date();

    // ステータスの更新
    this.health.status = this.health.errorRate > 0.5 ? 'degraded' : 'healthy';
  }

  getHealth(): ProviderHealth {
    return { ...this.health };
  }
}
