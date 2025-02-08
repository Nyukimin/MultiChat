import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';
import { loadCharacterPrompt } from '@/app/lib/utils/characterLoader';

export async function POST(request: Request) {
  try {
    const { character, message } = await request.json();

    // サーバーサイドでのみAnthropicクライアントを初期化
    const anthropic = new Anthropic({
      apiKey: config.api.anthropic.apiKey,
      dangerouslyAllowBrowser: false
    });

    // キャラクター固有のシステムプロンプトをロード
    const systemPrompt = await loadCharacterPrompt(character.id);

    // Anthropic APIを呼び出し
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });

    // レスポンスを返す
    return NextResponse.json({
      response: response.content[0].text
    });

  } catch (error) {
    console.error('キャラクターレスポンス生成中にエラー:', error);
    
    return NextResponse.json({
      error: 'キャラクターレスポンスの生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
