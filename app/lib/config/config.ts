// 環境変数の型定義
type Config = {
  api: {
    anthropic: {
      apiKey: string;
    };
    gemini: {
      apiKey: string;
    };
  };
  ollama: {
    baseUrl: string;
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
    anthropic: {
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
    },
    gemini: {
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    },
  },
  ollama: {
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_DEFAULT_MODEL || 'hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S',
  },
  app: {
    chatSpeed: Number(process.env.CHAT_SPEED) || 5,
    debugMode: process.env.DEBUG_MODE === 'true',
  },
};

// 設定値の存在チェック
function validateConfig() {
  if (!config.api.anthropic.apiKey) {
    console.warn('Warning: NEXT_PUBLIC_ANTHROPIC_API_KEY is not set');
  }
  if (!config.api.gemini.apiKey) {
    console.warn('Warning: NEXT_PUBLIC_GEMINI_API_KEY is not set');
  }
  if (!config.ollama.baseUrl) {
    console.warn('Warning: NEXT_PUBLIC_OLLAMA_BASE_URL is not set');
  }
}

// 開発環境でのみ設定値をチェック
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}

export default config;
