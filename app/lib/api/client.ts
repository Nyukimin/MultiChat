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

  public async generate(prompt: string, llmType: 'anthropic' | 'gemini' | 'ollama'): Promise<ApiResponse> {
    switch(llmType) {
      case 'ollama':
        return this.generateOllama(prompt);
      case 'anthropic':
        return this.generateAnthropic(prompt);
      case 'gemini':
        return this.generateGemini(prompt);
      default:
        throw new Error('サポートされていないLLMタイプです');
    }
  }

  private async generateOllama(prompt: string): Promise<ApiResponse> {
    if (!this.config.ollama.baseUrl) {
      throw new Error('Ollama base URL is not configured');
    }

    const response = await fetch(`${this.config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.ollama.model || 'hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.response,
      model: data.model,
      provider: 'ollama'
    };
  }

  private async generateAnthropic(prompt: string): Promise<ApiResponse> {
    if (!this.config.apiKeys.anthropic) {
      throw new Error('Anthropic API key is not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKeys.anthropic,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      model: data.model,
      provider: 'anthropic'
    };
  }

  private async generateGemini(prompt: string): Promise<ApiResponse> {
    if (!this.config.apiKeys.gemini) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.apiKeys.gemini}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      model: 'gemini-pro',
      provider: 'gemini'
    };
  }
}
