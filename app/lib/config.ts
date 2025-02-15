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
    options?: {
      temperature?: number;
      top_k?: number;
      top_p?: number;
      repeat_penalty?: number;
    };
  };
  debug: {
    enabled: boolean;
    chatSpeed: number;
  };
}

// 環境変数設定
export const envConfig: EnvConfig = {
  anthropic: {
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
    model: 'claude-3-opus-20240229',
    maxTokens: 4000,
  },
  gemini: {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    model: 'gemini-pro',
    maxTokens: 2048,
  },
  ollama: {
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S',
    maxTokens: 2048,
    options: {
      temperature: Number(process.env.NEXT_PUBLIC_OLLAMA_TEMPERATURE) || 0.7,
      top_k: Number(process.env.NEXT_PUBLIC_OLLAMA_TOP_K) || 40,
      top_p: Number(process.env.NEXT_PUBLIC_OLLAMA_TOP_P) || 0.9,
      repeat_penalty: Number(process.env.NEXT_PUBLIC_OLLAMA_REPEAT_PENALTY) || 1.1,
    },
  },
  debug: {
    enabled: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    chatSpeed: Number(process.env.NEXT_PUBLIC_CHAT_SPEED) || 5,
  },
};

// 設定値の検証
export function validateConfig() {
  console.log('[Config] Validating environment variables...');

  // Anthropicの検証
  if (!envConfig.anthropic.apiKey) {
    console.warn('[Config] Anthropic API key is not set');
  }

  // Geminiの検証
  if (!envConfig.gemini.apiKey) {
    console.warn('[Config] Gemini API key is not set');
  }

  // Ollamaの検証
  if (!envConfig.ollama.baseUrl) {
    throw new Error('Ollama base URL is required');
  }

  console.log('[Config] Current configuration:', {
    anthropic: { apiKeySet: !!envConfig.anthropic.apiKey, model: envConfig.anthropic.model },
    gemini: { apiKeySet: !!envConfig.gemini.apiKey, model: envConfig.gemini.model },
    ollama: {
      baseUrl: envConfig.ollama.baseUrl,
      model: envConfig.ollama.model
    },
    debug: envConfig.debug
  });
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
