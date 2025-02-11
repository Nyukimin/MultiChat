export type LLMType = 'anthropic' | 'gemini' | 'ollama';

export interface MessageContent {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMClient {
  generate(message: MessageContent, options?: LLMOptions): Promise<LLMResponse>;
}
