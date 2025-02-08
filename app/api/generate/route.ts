import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';

export async function POST(request: Request) {
  try {
    // リクエストボディを解析
    const { prompt } = await request.json();

    // サーバーサイドでのみAnthropicクライアントを初期化
    const anthropic = new Anthropic({
      apiKey: config.api.anthropic.apiKey,
      // ブラウザ環境での使用を明示的に防止
      dangerouslyAllowBrowser: false
    });

    // Anthropic APIを呼び出し
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });

    // レスポンスを返す
    return NextResponse.json({
      message: response.content[0].text
    });

  } catch (error) {
    console.error('API呼び出し中にエラーが発生:', error);
    
    return NextResponse.json({
      error: 'APIの呼び出し中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
