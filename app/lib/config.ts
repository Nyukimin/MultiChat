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
  debug: {
    enabled: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    chatSpeed: Number(process.env.NEXT_PUBLIC_CHAT_SPEED) || 5,
  }
};

// 設定値の検証
function validateConfig() {
  // Anthropic APIキーの検証
  if (!envConfig.anthropic.apiKey) {
    console.warn('Warning: Anthropic API key is not set');
  }

  // Gemini APIキーの検証
  if (!envConfig.gemini.apiKey) {
    console.warn('Warning: Gemini API key is not set');
  }

  // チャット速度の検証
  if (envConfig.debug.chatSpeed < 1 || envConfig.debug.chatSpeed > 10) {
    console.warn('Warning: Chat speed should be between 1 and 10');
  }
}

// 設定の初期検証を実行
validateConfig();

// 環境変数アクセス用ヘルパー関数
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return envConfig[key];
}

// デバッグモード判定
export function isDebugMode(): boolean {
  return envConfig.debug.enabled;
}

// チャット速度取得
export function getChatSpeed(): number {
  return envConfig.debug.chatSpeed;
}
