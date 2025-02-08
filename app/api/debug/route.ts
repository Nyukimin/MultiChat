import { NextResponse } from 'next/server';
import config from '@/app/lib/config/config';

export async function GET() {
  // サーバーサイドの環境変数のみを返す
  return NextResponse.json({
    ollama: {
      host: config.ollama.host,
      model: config.ollama.model,
    },
    app: {
      chatSpeed: config.app.chatSpeed,
      debugMode: config.app.debugMode,
    },
    // APIキーは最初の数文字のみを表示（セキュリティのため）
    apiKeysStatus: {
      google: config.api.google.apiKey ? '設定済み' : '未設定',
      anthropic: config.api.anthropic.apiKey ? '設定済み' : '未設定',
      gemini: config.api.gemini.apiKey ? '設定済み' : '未設定',
    }
  });
}
