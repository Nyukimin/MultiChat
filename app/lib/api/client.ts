import { getConfig } from '../config/config';

export const AI_MODEL_VERSION = 'Claude-3-Sonnet-20241022';

interface ApiResponse {
  content: string;
  model: string;
  provider: 'anthropic' | 'gemini' | 'ollama';
}

export class APIClient {
  private static instance: APIClient;
  private config;

  constructor() {
    if (APIClient.instance) {
      return APIClient.instance;
    }
    this.config = getConfig();
    APIClient.instance = this;
  }

  public async *generate(prompt: string, llmType: 'anthropic' | 'gemini' | 'ollama'): AsyncGenerator<string> {
    switch(llmType) {
      case 'ollama':
        yield* this.generateOllamaStream(prompt);
        break;
      case 'anthropic':
        yield* this.generateAnthropicStream(prompt);
        break;
      case 'gemini':
        yield* this.generateGeminiStream(prompt);
        break;
      default:
        throw new Error('サポートされていないLLMタイプです');
    }
  }

  private async *generateOllamaStream(prompt: string): AsyncGenerator<string> {
    if (!this.config?.ollama?.baseUrl) {
      throw new Error('Ollama base URL is not configured');
    }

    const response = await fetch(`${this.config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.ollama?.model || 'phi',
        prompt: prompt,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Ollama API Error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('ストリームリーダーの取得に失敗しました');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          const match = line.match(/"response":"([^"]+)"/);
          if (match && match[1]) {
            yield match[1];
          }
        }
      }
    }
  }

  private async *generateAnthropicStream(prompt: string): AsyncGenerator<string> {
    if (!this.config?.apiKeys?.anthropic) {
      throw new Error('Anthropic API key is not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKeys.anthropic,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Anthropic API Error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('ストリームリーダーの取得に失敗しました');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6);
          if (text && text !== '[DONE]') {
            yield text;
          }
        }
      }
    }
  }

  private async *generateGeminiStream(prompt: string): AsyncGenerator<string> {
    if (!this.config?.apiKeys?.gemini) {
      throw new Error('Gemini API key is not configured');
    }

    console.log('Gemini：送信：' + prompt);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${this.config.apiKeys.gemini}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('ストリームリーダーの取得に失敗しました');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      
      // 終了マーカー "]" は無視
      if (chunk.trim() === ']') continue;
      
      console.log('Gemini：受信：' + chunk);
      yield chunk;
    }
  }
}
