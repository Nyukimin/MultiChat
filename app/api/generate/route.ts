import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import config from '@/app/lib/config/config';

export async function POST(request: Request) {
  try {
    // APIキーの存在確認
    if (!config.api.anthropic.apiKey) {
      throw new Error('Anthropic APIキーが設定されていません');
    }

    // リクエストボディを解析
    const { instruction, characters } = await request.json();

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
          console.error(`Error for character ${characterId}:`, error);
          return {
            characterId,
            message: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          };
        }
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
