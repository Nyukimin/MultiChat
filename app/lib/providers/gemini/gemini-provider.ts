import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';
import config from '../../config/config';

export class GeminiProvider extends AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(providerConfig: ProviderConfig) {
    super(providerConfig);

    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Gemini API key is not configured',
        'Gemini'
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com';
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      console.log('[Gemini] リクエスト開始', {
        model: this.config.parameters.model || 'gemini-pro',
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${this.baseUrl}/v1/models/gemini-pro:streamGenerateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: this.config.parameters.maxTokens || 2048,
            temperature: this.config.parameters.temperature || 0.7
          }
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Gemini] APIエラー詳細:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Geminiサーバーエラー: ${response.status} ${response.statusText}\n${errorBody}`,
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
                console.log('[Gemini] ストリーム終了');
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              console.log('[Gemini] バッファ:', buffer);

              try {
                // 完全なJSONを探す
                if (buffer.startsWith('[{') && buffer.endsWith(']')) {
                  const data = JSON.parse(buffer);
                  if (Array.isArray(data) && data.length > 0) {
                    const text = data[0]?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      console.log('[Gemini] テキスト抽出:', text);
                      controller.enqueue('data: ' + JSON.stringify({ text }) + '\n\n');
                    }
                    buffer = '';
                  }
                }
              } catch (error) {
                console.error('[Gemini] JSONパースエラー:', error);
              }

              console.log('[Gemini] 受信データ:', value);
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
