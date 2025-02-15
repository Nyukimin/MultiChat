export interface ProviderHealth {
  isHealthy: boolean;
  lastCheckTime: Date;
  errorMessage?: string;
  responseTime?: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  parameters: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    [key: string]: any;
  };
}

export abstract class AIProvider {
  protected health: ProviderHealth = {
    isHealthy: true,
    lastCheckTime: new Date()
  };

  constructor(protected config: ProviderConfig) {}

  abstract streamChat(prompt: string): Promise<ReadableStream>;
  
  protected updateHealth(responseTime?: number, error?: Error): void {
    this.health = {
      isHealthy: !error,
      lastCheckTime: new Date(),
      errorMessage: error?.message,
      responseTime
    };
  }

  getHealth(): ProviderHealth {
    return this.health;
  }
}
