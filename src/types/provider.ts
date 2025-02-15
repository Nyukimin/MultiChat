export interface ProviderConfig {
  name: string;
  type: string;
  baseUrl: string;
  authType: 'api_key' | 'none';
  parameters: {
    [key: string]: any;
  };
  rateLimit: {
    requestsPerMinute: number;
    maxConcurrent: number;
  };
}

export interface LLMProvider {
  initialize(config: ProviderConfig): Promise<void>;
  generate(prompt: string, params?: Record<string, any>): AsyncIterable<string>;
  getHealth(): ProviderHealth;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'error';
  latency: number;
  errorRate: number;
  lastChecked: Date;
}

export type ProviderType = 'anthropic' | 'gemini' | 'ollama';
