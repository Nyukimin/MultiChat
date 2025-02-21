export type SupportedProvider = 'anthropic' | 'gemini' | 'ollama';

export interface ProviderParameters {
  model: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: {
    enabled: boolean;
    mode: 'raw' | 'buffered';
  };
}

export interface ProviderConfig {
  name: string;
  type: 'cloud' | 'local';
  baseUrl: string;
  authType: 'api_key' | 'oauth2';
  parameters: ProviderParameters;
  rateLimit: {
    requestsPerMinute: number;
    maxConcurrent: number;
  };
}
