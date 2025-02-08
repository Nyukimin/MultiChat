import config from '../config/config';
import { createChatCompletion } from './chatCompletion';
import { loadCharacterPrompt } from '../utils/characterLoader';

export async function fetchCharacterResponses(
  characterId: string, 
  message: string
): Promise<string> {
  try {
    // キャラクター固有のシステムプロンプトをロード
    const systemPrompt = await loadCharacterPrompt(characterId);

    // チャット完了APIを呼び出し
    const response = await createChatCompletion({
      model: 'claude-3-sonnet-20240229', // Anthropicモデルを使用
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300, // 応答の最大トークン数
      temperature: 0.7 // クリエイティビティのレベル
    });

    return response.choices[0].message.content || '応答を生成できませんでした。';
  } catch (error) {
    console.error(`キャラクター ${characterId} の応答生成中にエラーが発生:`, error);
    return 'エラーが発生しました。';
  }
}
