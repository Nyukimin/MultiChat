export interface ProviderHealth {
  isHealthy: boolean;
  lastCheckTime: Date;
  errorMessage?: string;
  responseTime?: number;
}

export interface BaseProviderParameters {
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
  [key: string]: any;
}

export interface ProviderConfig<T extends BaseProviderParameters = BaseProviderParameters> {
  name: string;
  apiKey?: string;
  parameters: T;
}

export abstract class AIProvider<T extends BaseProviderParameters = BaseProviderParameters> {
  protected health: ProviderHealth = {
    isHealthy: true,
    lastCheckTime: new Date(),
  };

  protected readonly config: ProviderConfig<T>;

  constructor(config: ProviderConfig<T>) {
    this.config = config;
  }

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
