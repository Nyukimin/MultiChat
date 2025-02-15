import { ProviderConfig } from './base/ai-provider';

export interface GlobalConfig {
  providers: {
    [key: string]: ProviderConfig;
  };
  debug: boolean;
}

const config: GlobalConfig = {
  providers: {
    claude: {
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
      parameters: {
        model: 'claude-3-opus-20240229',
        maxTokens: 1024,
        temperature: 0.7
      }
    },
    gemini: {
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      parameters: {
        model: 'gemini-pro',
        maxTokens: 1024,
        temperature: 0.7
      }
    }
  },
  debug: process.env.NODE_ENV === 'development'
};

export function getConfig(): GlobalConfig {
  return config;
}

export function getProviderConfig(provider: string): ProviderConfig {
  const config = getConfig();
  return config.providers[provider];
}
