import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';

export async function POST(request: Request) {
  try {
    // リクエストボディを解析
    const { instruction, characters } = await request.json();

    // サーバーサイドでのみAnthropicクライアントを初期化
    const anthropic = new Anthropic({
      apiKey: config.api.anthropic.apiKey,
      dangerouslyAllowBrowser: false
    });

    // 各キャラクターに対して並列でAPIコールを実行
    const characterResponses = await Promise.all(
      characters.map(async (characterId: string) => {
        // キャラクターごとに異なるプロンプトを生成
        const characterPrompt = `
あなたは${characterId}というキャラクターです。
以下の指示に対して、あなたの性格と特徴に基づいて返答してください：

${instruction}
        `.trim();

        const response = await anthropic.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1024,
          messages: [{ role: "user", content: characterPrompt }]
        });

        return {
          characterId,
          message: response.content[0].text
        };
      })
    );

    // レスポンスを返す
    return NextResponse.json({
      responses: characterResponses
    });

  } catch (error) {
    console.error('API呼び出し中にエラーが発生:', error);
    
    return NextResponse.json({
      error: 'APIの呼び出し中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
