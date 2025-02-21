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
    console.log('Gemini：送信：' + prompt);

    try {
      const response = await fetch(this.baseUrl + '/v1/models/gemini-pro:streamGenerateContent?key=' + this.apiKey, {
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

      if (!response.body) {
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
                console.log('Gemini：受信：' + chunk);
                controller.enqueue(chunk);
              }
            } catch (error) {
              console.error('❌ Gemini：ストリームエラー:', error);
              controller.error(error);
            }
          })();
        }
      });
    } catch (error) {
      console.error('❌ Gemini：ストリームエラー:', error);
      throw error;
    }
  }
}
