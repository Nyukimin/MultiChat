import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';
import { GeminiParser } from './gemini-parser';

export class GeminiProvider extends AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly parser: GeminiParser;

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
    this.parser = new GeminiParser();
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    console.log('Gemini：送信：' + prompt);

    try {
      const response = await fetch(this.baseUrl + '/v1/models/gemini-pro:generateContent?key=' + this.apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: this.config.parameters
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini：APIエラー [gemini-provider.ts:46]：', errorText);
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        console.error('Gemini：エラー [gemini-provider.ts:51]：レスポンスボディが空です');
        throw new Error('レスポンスボディが空です');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      return new ReadableStream({
        start: (controller) => {
          return (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  controller.close();
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                try {
                  const parsedText = this.parser.parse(chunk);
                  if (parsedText) {
                    controller.enqueue(parsedText);
                  }
                } catch (parseError) {
                  console.error('Gemini：パース処理エラー [gemini-provider.ts:77]：', parseError);
                  controller.error(parseError);
                }
              }
            } catch (streamError) {
              console.error('Gemini：ストリーム処理エラー [gemini-provider.ts:82]：', streamError);
              controller.error(streamError);
            }
          })();
        }
      });
    } catch (error) {
      console.error('Gemini：リクエストエラー [gemini-provider.ts:89]：', error);
      throw error;
    }
  }
}
