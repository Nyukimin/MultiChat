import { Character } from '../types/character';
import { createChatCompletion } from './chatCompletion';

export async function getCharacterResponse(character: Character, message: string) {
  try {
    const response = await fetch('/api/character/response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character,
        message
      })
    });

    if (!response.ok) {
      throw new Error('キャラクターレスポンスの取得に失敗');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('キャラクターレスポンスの取得中にエラー:', error);
    throw error;
  }
}
