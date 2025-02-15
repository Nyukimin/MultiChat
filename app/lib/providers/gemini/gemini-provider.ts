import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ProviderError, ErrorCode } from '../base/provider-error';

export class GeminiProvider extends AIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new ProviderError(
        ErrorCode.INITIALIZATION_ERROR,
        'API key is required for Gemini provider',
        'Gemini'
      );
    }
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    const startTime = Date.now();
    try {
      const model = this.client.getGenerativeModel({ 
        model: this.config.parameters.model || 'gemini-pro',
      });

      const result = await model.generateContentStream([prompt]);

      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(text);
              }
            }
            controller.close();
          } catch (error) {
            controller.error(ProviderError.fromError(error as Error, 'Gemini'));
          }
        }
      });
    } catch (error) {
      throw ProviderError.fromError(error as Error, 'Gemini');
    }
  }
}
