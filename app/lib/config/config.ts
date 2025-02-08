// 環境変数の型定義
type Config = {
  api: {
    anthropic: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
    google: {
      apiKey: string;
    };
    gemini: {
      apiKey: string;
    };
    ollama: {
      host: string;
      model: string;
    };
  };
  app: {
    debug: boolean;
  };
};

// 設定オブジェクト
const config: Config = {
  api: {
    anthropic: {
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
      baseUrl: "https://api.anthropic.com/v1/",
      defaultModel: "claude-3-sonnet-20240229",
      model: 'claude-3-sonnet-20240229',
      maxTokens: 300,
      temperature: 0.7,
    },
    google: {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    },
    gemini: {
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    },
    ollama: {
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || '',
    },
  },
  app: {
    debug: process.env.NODE_ENV === 'development',
  },
} as const;

// 必須環境変数の検証
const requiredEnvVars = [
  'NEXT_PUBLIC_ANTHROPIC_API_KEY',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`必要な環境変数 ${envVar} が設定されていません。`);
  }
}

export default config;
