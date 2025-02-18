import { Character } from '../types/character';

export async function getCharacterResponse(character: Character, message: string): Promise<string> {
  let eventSource: EventSource | null = null;

  return new Promise((resolve, reject) => {
    try {
      // 既存の接続があれば閉じる
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      eventSource = new EventSource(
        `/api/chat?prompt=${encodeURIComponent(message)}&llm=${character.id}`
      );

      let result = '';

      // readyStateの変更を監視
      eventSource.onopen = () => {
        console.log(`[${character.id}] 接続開始`);
      };

      eventSource.onmessage = (event) => {
        // 接続が閉じられている場合は処理しない
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          return;
        }

        if (event.data === '[DONE]') {
          console.log(`[${character.id}] ストリーム完了`);
          eventSource.close();
          eventSource = null;
          resolve(result);
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            result += data.text;
          }
        } catch (error) {
          console.error(`[${character.id}] JSONパースエラー:`, error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[${character.id}] SSEエラー:`, error);
        
        if (eventSource) {
          // エラー発生時は確実に接続を閉じる
          eventSource.close();
          eventSource = null;
        }
        
        reject(new Error('ストリーミング中にエラーが発生しました'));
      };

    } catch (error) {
      // 初期化時のエラー
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      console.error(`[${character.id}] 接続エラー:`, error);
      reject(error);
    }
  });
}

export async function getMultiCharacterResponses(characters: Character[], message: string): Promise<Map<string, string>> {
  let eventSource: EventSource | null = null;

  return new Promise((resolve, reject) => {
    try {
      // 既存の接続があれば閉じる
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      const responses = new Map<string, string>();

      eventSource = new EventSource(
        `/api/chat/multi?prompt=${encodeURIComponent(message)}&llms=${characters.map(c => c.id).join(',')}`
      );

      // readyStateの変更を監視
      eventSource.onopen = () => {
        console.log(`[${characters.map(c => c.id).join(', ')}] 接続開始`);
      };

      eventSource.onmessage = (event) => {
        // 接続が閉じられている場合は処理しない
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          return;
        }

        if (event.data === '[DONE]') {
          console.log(`[${characters.map(c => c.id).join(', ')}] ストリーム完了`);
          eventSource.close();
          eventSource = null;
          resolve(responses);
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.characterId && data.text) {
            const currentResponse = responses.get(data.characterId) || '';
            responses.set(data.characterId, currentResponse + data.text);
          }
        } catch (error) {
          console.error(`[${characters.map(c => c.id).join(', ')}] JSONパースエラー:`, error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[${characters.map(c => c.id).join(', ')}] SSEエラー:`, error);
        
        if (eventSource) {
          // エラー発生時は確実に接続を閉じる
          eventSource.close();
          eventSource = null;
        }
        
        reject(new Error('ストリーミング中にエラーが発生しました'));
      };

    } catch (error) {
      // 初期化時のエラー
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      console.error(`[${characters.map(c => c.id).join(', ')}] 接続エラー:`, error);
      reject(error);
    }
  });
}
