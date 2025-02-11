import { BaseLLMClient } from './base';
import { MessageContent, LLMOptions, LLMResponse } from '../types/ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config';

export class GeminiClient extends BaseLLMClient {
  private client: GoogleGenerativeAI;

  constructor() {
    super('Gemini', config.api.gemini);
    this.client = new GoogleGenerativeAI(this.config.apiKey);
  }

  async generate(message: MessageContent, options?: LLMOptions): Promise<LLMResponse> {
    try {
      const model = this.client.getGenerativeModel({ 
        model: options?.model || 'gemini-pro'
      });

      const result = await model.generateContent(message.content);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: 'gemini-pro',
        usage: {
          // Note: Gemini currently doesn't provide token usage info
          totalTokens: 0,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
