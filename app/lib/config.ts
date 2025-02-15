// 環境変数の型定義
export interface EnvConfig {
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  gemini: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  ollama: {
    baseUrl: string;
    model: string;
    maxTokens: number;
  };
  debug: {
    enabled: boolean;
    chatSpeed: number;
  };
}

// 環境変数設定
export const envConfig: EnvConfig = {
  anthropic: {
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    model: 'claude-3-opus-20240229',
    maxTokens: 1024
  },
  gemini: {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    model: 'gemini-pro',
    maxTokens: 1024
  },
  ollama: {
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama2',
    maxTokens: 1024
  },
  debug: {
    enabled: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    chatSpeed: parseInt(process.env.NEXT_PUBLIC_CHAT_SPEED || '5', 10)
  }
};

// 設定値の検証
export function validateConfig() {
  console.log('[Config] Validating environment variables...');
  
  const missingVars = [];
  
  if (!envConfig.anthropic.apiKey) {
    missingVars.push('NEXT_PUBLIC_ANTHROPIC_API_KEY');
  }
  
  if (!envConfig.gemini.apiKey) {
    missingVars.push('NEXT_PUBLIC_GEMINI_API_KEY');
  }
  
  if (!envConfig.ollama.baseUrl) {
    missingVars.push('NEXT_PUBLIC_OLLAMA_BASE_URL');
  }

  if (missingVars.length > 0) {
    console.warn('[Config] Missing environment variables:', missingVars);
  }

  console.log('[Config] Current configuration:', {
    anthropic: {
      apiKeySet: !!envConfig.anthropic.apiKey,
      model: envConfig.anthropic.model
    },
    gemini: {
      apiKeySet: !!envConfig.gemini.apiKey,
      model: envConfig.gemini.model
    },
    ollama: {
      baseUrl: envConfig.ollama.baseUrl,
      model: envConfig.ollama.model
    },
    debug: envConfig.debug
  });

  return missingVars.length === 0;
}

// 設定の初期検証を実行
validateConfig();

// 環境変数アクセス用ヘルパー関数
export const getEnv = <K extends keyof EnvConfig>(key: K): EnvConfig[K] => {
  const value = envConfig[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

// デバッグモード判定
export const isDebugMode = (): boolean => envConfig.debug.enabled;

// チャット速度取得
export const getChatSpeed = (): number => envConfig.debug.chatSpeed;
