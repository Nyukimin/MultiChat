import { LLMClient, MessageContent, LLMOptions, LLMResponse } from '../types/ai';

export abstract class BaseLLMClient implements LLMClient {
  protected constructor(
    protected readonly name: string,
    protected readonly config: Record<string, any>
  ) {}

  abstract generate(message: MessageContent, options?: LLMOptions): Promise<LLMResponse>;

  protected handleError(error: unknown): never {
    console.error(`${this.name} client error:`, error);
    throw error;
  }
}
