import { Character } from '../context/ChatContext';
import { generateCharacterResponse } from '../actions/chat';

export async function fetchCharacterResponses(
  message: string,
  characters: Character[]
): Promise<Array<{ id: string; response: string }>> {
  try {
    const responses = await Promise.all(
      characters.map(async (character) => {
        const result = await generateCharacterResponse(character.id, message);
        return {
          id: character.id,
          response: result.error || result.content || 'レスポンスを生成できませんでした。',
        };
      })
    );

    return responses;
  } catch (error) {
    console.error('キャラクターレスポンスの取得中にエラーが発生:', error);
    return characters.map(character => ({
      id: character.id,
      response: 'エラーが発生しました。',
    }));
  }
}
