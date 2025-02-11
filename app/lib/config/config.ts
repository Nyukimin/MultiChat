'use server';

// 環境変数の型定義
export type Config = {
  anthropic: {
    apiKey: string;
    maxTokens: number;
    temperature: number;
  };
};

// 設定オブジェクト
const config: Config = {
  anthropic: {
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
    maxTokens: 1000,
    temperature: 0.7,
  },
};

// 環境変数の検証
function validateConfig() {
  if (!config.anthropic.apiKey) {
    throw new Error('NEXT_PUBLIC_ANTHROPIC_API_KEY is not set');
  }
}

validateConfig();

// 設定を取得する関数
export function getConfig(): Config {
  return config;
}
