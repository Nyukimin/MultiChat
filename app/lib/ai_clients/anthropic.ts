'use server';

import { MessageContent, LLMOptions, LLMResponse, LLMClient } from '../types/ai';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config/config';

export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private initialized: boolean = false;

  constructor() {
    const config = getConfig();
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.client.messages.create({
        model: 'claude-3-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      this.initialized = true;
    } catch (error) {
      console.error('Anthropic client initialization failed:', error);
      throw new Error('Failed to initialize Anthropic client');
    }
  }

  async generate(message: MessageContent, options?: LLMOptions): Promise<LLMResponse> {
    await this.ensureInitialized();

    try {
      const config = getConfig();
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20241022',
        max_tokens: options?.maxTokens || config.anthropic.maxTokens,
        temperature: options?.temperature || config.anthropic.temperature,
        system: options?.systemPrompt,
        messages: [{
          role: message.role,
          content: message.content
        }]
      });

      // レスポンスの型を確認
      const content = response.content[0];
      if ('text' in content) {
        return {
          content: content.text,
          usage: {
            promptTokens: response.usage?.input_tokens,
            completionTokens: response.usage?.output_tokens,
            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          }
        };
      } else {
        throw new Error('Unexpected response format from Anthropic API');
      }
    } catch (error) {
      console.error('Anthropic API Error:', error);
      throw new Error('Failed to generate response from Anthropic API');
    }
  }
}
