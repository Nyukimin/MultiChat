import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config/config';

// Anthropicクライアントの初期化
const anthropic = new Anthropic({
  apiKey: config.api.anthropic.apiKey
});

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
    const response = await anthropic.messages.create({
      model: config.api.anthropic.model,
      max_tokens: options.max_tokens || config.api.anthropic.maxTokens,
      temperature: options.temperature || config.api.anthropic.temperature,
      messages: options.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    return {
      choices: [{
        message: {
          content: response.content[0].text,
          role: 'assistant'
        }
      }]
    };
  } catch (error) {
    console.error('チャット完了APIの呼び出し中にエラーが発生:', error);
    throw error;
  }
}
