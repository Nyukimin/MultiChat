import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import config from '../config/config';

// チャット完了APIの型定義
interface ChatCompletionOptions {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant', content: string }[];
  max_tokens?: number;
  temperature?: number;
}

// チャット完了APIの呼び出し
export async function createChatCompletion(options: ChatCompletionOptions) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error('APIレスポンスエラー');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('チャット完了中にエラーが発生:', error);
    throw error;
  }
}
