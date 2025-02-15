import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';

export class GeminiProvider extends AIProvider {
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);

    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Gemini API key is not configured',
        'Gemini'
      );
    }
    this.apiKey = apiKey;
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      console.log('[Gemini] リクエスト開始', {
        model: this.config.parameters.model,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${this.config.parameters.model || 'gemini-pro'}:streamGenerateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: this.config.parameters.maxTokens || 1024,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Geminiサーバーエラー: ${response.status} ${response.statusText}`,
          'Gemini'
        );
      }

      if (!response.body) {
        throw new ProviderError(
          ErrorCode.STREAM_ERROR,
          'ストリームの初期化に失敗しました',
          'Gemini'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;

                try {
                  const data = JSON.parse(line);
                  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    controller.enqueue(data.candidates[0].content.parts[0].text);
                  }
                } catch (error) {
                  console.error('[Gemini] JSONパースエラー:', error);
                  continue;
                }
              }
            }
          } catch (error) {
            console.error('[Gemini] ストリームエラー:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('[Gemini] リクエストエラー:', error);
      throw error;
    }
  }
}
