import { BaseLLMClient } from './base';
import { MessageContent, LLMOptions, LLMResponse } from '../types/ai';
import config from '../config/config';

export class OllamaClient extends BaseLLMClient {
  constructor() {
    super('Ollama', config.api.ollama);
  }

  async generate(message: MessageContent, options?: LLMOptions): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.config.model,
          prompt: message.content,
          options: {
            temperature: options?.temperature || 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.response,
        model: data.model,
        usage: {
          // Note: Ollama provides different token metrics
          totalTokens: data.total_duration ? Math.floor(data.total_duration) : 0,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
