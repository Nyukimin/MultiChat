import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ProviderConfig, ProviderHealth } from '../types/provider';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI | null = null;
  private config: ProviderConfig | null = null;
  private health: ProviderHealth = {
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    lastChecked: new Date()
  };

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.client = new GoogleGenerativeAI(process.env[config.parameters.apiKeyEnv] || '');
  }

  async *generate(prompt: string, params?: Record<string, any>): AsyncIterable<string> {
    if (!this.client || !this.config) {
      throw new Error('Provider not initialized');
    }

    const startTime = Date.now();
    
    try {
      const model = this.client.getGenerativeModel({
        model: params?.model || this.config.parameters.model || 'gemini-pro'
      });

      const result = await model.generateContentStream([
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }

      this.updateHealth(Date.now() - startTime, false);
    } catch (error) {
      this.updateHealth(Date.now() - startTime, true);
      throw error;
    }
  }

  private updateHealth(latency: number, hasError: boolean): void {
    const now = Date.now();
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
