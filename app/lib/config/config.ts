// 環境変数の型定義
type Config = {
  api: {
    google: {
      apiKey: string;
    };
    anthropic: {
      apiKey: string;
    };
    gemini: {
      apiKey: string;
    };
  };
  ollama: {
    host: string;
    model: string;
  };
  app: {
    chatSpeed: number;
    debugMode: boolean;
  };
};

// 設定オブジェクト
const config: Config = {
  api: {
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
  ollama: {
    host: process.env.NEXT_PUBLIC_OLLAMA_HOST,
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL,
  },
  app: {
    chatSpeed: Number(process.env.NEXT_PUBLIC_CHAT_SPEED) || 5,
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  },
} as const;

// 設定値の存在チェック
const validateConfig = () => {
  // サーバーサイドでのみチェック
  if (typeof window === 'undefined') {
    if (!config.api.google.apiKey) {
      console.warn('Warning: GOOGLE_API_KEY is not set');
    }
    if (!config.api.anthropic.apiKey) {
      console.warn('Warning: ANTHROPIC_API_KEY is not set');
    }
    if (!config.api.gemini.apiKey) {
      console.warn('Warning: GEMINI_API_KEY is not set');
    }
  }

  // クライアントサイドでも必要な設定のチェック
  if (!config.ollama.host) {
    throw new Error('NEXT_PUBLIC_OLLAMA_HOST is not set');
  }
  if (!config.ollama.model) {
    throw new Error('NEXT_PUBLIC_OLLAMA_MODEL is not set');
  }
};

// 開発環境でのみ設定値をチェック
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}

export default config;
