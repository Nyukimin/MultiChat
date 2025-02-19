// 環境変数の型定義
type Config = {
  api: {
    anthropic: {
      apiKey: string;
      baseUrl: string;
      model: string;
      maxTokens: number;
      temperature: number;
      rateLimit: {
        requestsPerMinute: number;
        maxConcurrent: number;
      };
    };
    gemini: {
      apiKey: string;
      baseUrl: string;
      model: string;
      maxTokens: number;
      temperature: number;
      rateLimit: {
        requestsPerMinute: number;
        maxConcurrent: number;
      };
    };
  };
  ollama: {
    baseUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
    rateLimit: {
      requestsPerMinute: number;
      maxConcurrent: number;
    };
  };
  app: {
    chatSpeed: number;
    debugMode: boolean;
    paths: {
      userConfig: string;
      systemConfig: string;
    };
  };
};

// パス設定
export const PATHS = {
  userConfig: process.env.NODE_ENV === 'development' ? './config/users' : '/config/users',
  systemConfig: process.env.NODE_ENV === 'development' ? './config/system' : '/config/system',
};

// 設定オブジェクト
const config: Config = {
  api: {
    anthropic: {
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-opus-20240229',
      maxTokens: 4096,
      temperature: 0.7,
      rateLimit: {
        requestsPerMinute: 20,
        maxConcurrent: 5,
      },
    },
    gemini: {
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      model: 'gemini-1.5-pro-latest',
      maxTokens: 2048,
      temperature: 0.7,
      rateLimit: {
        requestsPerMinute: 30,
        maxConcurrent: 5,
      },
    },
  },
  ollama: {
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'phi-4-deepseek',
    maxTokens: 2048,
    temperature: 0.7,
    rateLimit: {
      requestsPerMinute: 60,
      maxConcurrent: 10,
    },
  },
  app: {
    chatSpeed: Number(process.env.CHAT_SPEED) || 5,
    debugMode: process.env.DEBUG_MODE === 'true',
    paths: PATHS,
  },
};

// 設定値の存在チェック
function validateConfig() {
  if (!config.api.anthropic.apiKey) {
    console.warn('Warning: Anthropic API key is not set');
  }
  if (!config.api.gemini.apiKey) {
    console.warn('Warning: Gemini API key is not set');
  }
  if (!config.ollama.baseUrl) {
    console.warn('Warning: Ollama base URL is not set');
  }
}

// 開発環境でのみ設定値をチェック
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}

// ユーティリティ関数
export function getProviderConfig(provider: 'anthropic' | 'gemini' | 'ollama') {
  switch (provider) {
    case 'anthropic':
      return config.api.anthropic;
    case 'gemini':
      return config.api.gemini;
    case 'ollama':
      return config.ollama;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function getUserConfigPath(userId: string): string {
  return `${config.app.paths.userConfig}/${userId}.json`;
}

export function getSystemConfigPath(): string {
  return config.app.paths.systemConfig;
}

export const getConfig = () => ({
  chatSpeed: process.env.NEXT_PUBLIC_CHAT_SPEED ? parseInt(process.env.NEXT_PUBLIC_CHAT_SPEED, 10) : 5,
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  ollama: {
    host: process.env.NEXT_PUBLIC_OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || '',
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || process.env.NEXT_PUBLIC_OLLAMA_HOST
  },
  apiKeys: {
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
    gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  }
});

export type AppConfig = ReturnType<typeof getConfig>;

export default config;
