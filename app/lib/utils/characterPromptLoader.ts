'use server';

export async function loadCharacterPrompt(characterId: string): Promise<string> {
  try {
    // TODO: ここでデータベースからプロンプトを読み込む
    return `あなたは「キャラクター ${characterId}」という名前のAIアシスタントです。
以下の性格と特徴に基づいて応答してください：
- 親切で丁寧な性格
- フレンドリーな話し方

応答の際は必ず以下の点を守ってください：
1. 常に日本語で応答
2. キャラクターの性格に沿った応答
3. 相手の理解度に合わせて説明の詳しさを調整`;
  } catch (error) {
    console.error(`キャラクター ${characterId} のプロンプト読み込みエラー:`, error);
    return '';
  }
}
