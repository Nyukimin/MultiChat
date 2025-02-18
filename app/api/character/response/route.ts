import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';
import { loadCharacterPrompt } from '@/app/lib/utils/characterLoader';

// EventSourceはGETメソッドのみをサポートするため、POSTメソッドは提供しない
// Server-Sent Events (SSE)を使用してAIプロバイダーからのストリーミングレスポンスを実現
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const characterId = url.searchParams.get('character');
    const message = url.searchParams.get('message');

    if (!characterId || !message) {
      throw new Error('キャラクターIDとメッセージは必須です');
    }

    // サーバーサイドでのみAnthropicクライアントを初期化
    const anthropic = new Anthropic({
      apiKey: config.api.anthropic.apiKey,
      dangerouslyAllowBrowser: false
    });

    // キャラクター固有のシステムプロンプトをロード
    const systemPrompt = await loadCharacterPrompt(characterId);

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
    return new Response(
      JSON.stringify({ response: response.content[0].text }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error('キャラクターレスポンス生成中にエラー:', error);
    
    return new Response(
      JSON.stringify({
        error: 'キャラクターレスポンスの生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
