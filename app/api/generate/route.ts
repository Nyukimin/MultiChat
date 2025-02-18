import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';

// EventSourceはGETメソッドのみをサポートするため、POSTメソッドは提供しない
// Server-Sent Events (SSE)を使用してAIプロバイダーからのストリーミングレスポンスを実現
export async function GET(request: Request) {
  try {
    // APIキーの存在確認
    if (!config.api.anthropic.apiKey) {
      throw new Error('Anthropic APIキーが設定されていません');
    }

    // URLパラメータを解析
    const url = new URL(request.url);
    const instruction = url.searchParams.get('instruction');
    const characters = url.searchParams.get('characters')?.split(',');

    if (!instruction || !characters || characters.length === 0) {
      throw new Error('指示内容またはキャラクター選択が不正です');
    }

    // サーバーサイドでのみAnthropicクライアントを初期化
    const anthropic = new Anthropic({
      apiKey: config.api.anthropic.apiKey,
      dangerouslyAllowBrowser: false
    });

    // 各キャラクターに対して並列でAPIコールを実行
    const characterResponses = await Promise.all(
      characters.map(async (characterId: string) => {
        try {
          // キャラクターごとに異なるプロンプトを生成
          const characterPrompt = `
あなたは${characterId}というキャラクターです。
以下の指示に対して、あなたの性格と特徴に基づいて返答してください：

${instruction}
          `.trim();

          console.log(`Sending request for ${characterId}:`, characterPrompt);

          const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 1024,
            messages: [{ role: "user", content: characterPrompt }]
          });

          console.log(`Received response for ${characterId}:`, response.content[0].text);

          return {
            characterId,
            message: response.content[0].text
          };
        } catch (error) {
          console.error(`Error generating response for ${characterId}:`, error);
          return {
            characterId,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ responses: characterResponses }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }
      }
    );

  } catch (error) {
    console.error('Error in generate endpoint:', error);
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
