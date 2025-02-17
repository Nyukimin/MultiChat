import { Character } from '../types/character';

export async function getCharacterResponse(character: Character, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const eventSource = new EventSource(
        `/api/chat?prompt=${encodeURIComponent(message)}&llm=${character.id}`
      );

      let result = '';

      eventSource.onmessage = (event) => {
        console.log('[フロントエンド] 受信データ:', event.data);
        
        if (event.data === '[DONE]') {
          eventSource.close();
          resolve(result);
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            result += data.text;
          }
        } catch (error) {
          console.error('[フロントエンド] JSONパースエラー:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[フロントエンド] SSEエラー:', error);
        eventSource.close();
        reject(new Error('ストリーミング中にエラーが発生しました'));
      };

    } catch (error) {
      console.error('[フロントエンド] 接続エラー:', error);
      reject(error);
    }
  });
}
