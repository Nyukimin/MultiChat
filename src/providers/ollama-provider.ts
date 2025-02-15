import { LLMProvider, ProviderConfig, ProviderHealth } from '../types/provider';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string | null = null;
  private config: ProviderConfig | null = null;
  private health: ProviderHealth = {
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    lastChecked: new Date()
  };

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.baseUrl = process.env[config.parameters.baseUrlEnv] || config.baseUrl;
  }

  async *generate(prompt: string, params?: Record<string, any>): AsyncIterable<string> {
    if (!this.baseUrl || !this.config) {
      throw new Error('Provider not initialized');
    }

    const startTime = Date.now();
    const model = params?.model || this.config.parameters.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: {
            temperature: params?.temperature || 0.7,
            num_predict: params?.maxTokens || 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
            } catch (e) {
              console.error('Failed to parse JSON:', e);
            }
          }
        }
      } finally {
        reader.releaseLock();
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
