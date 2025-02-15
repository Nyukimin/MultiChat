import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ProviderError, ErrorCode } from '../base/provider-error';

export class GeminiProvider extends AIProvider {
  private client: GoogleGenerativeAI;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    console.log('[Gemini] Initializing provider with config:', {
      model: config.parameters.model,
      maxTokens: config.parameters.maxTokens,
      apiKeyLength: config.apiKey?.length
    });

    try {
      if (!config.apiKey) {
        throw new ProviderError(
          ErrorCode.CONFIGURATION_ERROR,
          'Gemini API key is not configured',
          'Gemini'
        );
      }

      super(config);
      this.config = config;
      this.client = new GoogleGenerativeAI(config.apiKey);

      console.log('[Gemini] Provider initialized successfully');
    } catch (error) {
      console.error('[Gemini] Initialization error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    console.log('[Gemini] Starting chat stream:', {
      promptLength: prompt.length,
      model: this.config.parameters.model,
      apiKeyPreview: this.config.apiKey?.slice(0, 5)
    });

    try {
      const model = this.client.getGenerativeModel({ 
        model: this.config.parameters.model || 'gemini-pro',
        generationConfig: {
          maxOutputTokens: this.config.parameters.maxTokens || 1024
        }
      });

      const result = await model.generateContentStream([prompt]);

      console.log('[Gemini] API response initialized:', {
        status: 'streaming',
        timestamp: new Date().toISOString()
      });

      return new ReadableStream({
        async start(controller) {
          console.log('[Gemini] Stream start');
          try {
            let fullText = '';
            for await (const chunk of result.stream) {
              const text = chunk.text();
              
              console.log('[Gemini] Received chunk:', {
                chunkLength: text?.length,
                preview: text?.slice(0, 50),
                timestamp: new Date().toISOString()
              });

              if (text) {
                fullText += text;
                controller.enqueue(text);
                
                console.log('[Gemini] Processing text chunk:', {
                  currentLength: fullText.length,
                  preview: fullText.slice(0, 100)
                });
              }
            }

            console.log('[Gemini] Message completed', {
              totalLength: fullText.length
            });
            
            controller.close();
          } catch (error) {
            console.error('[Gemini] Stream processing error:', {
              message: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
            controller.error(error);
          }
        },
        cancel() {
          console.log('[Gemini] Stream cancelled');
          // ストリームがキャンセルされた場合の処理
        }
      });
    } catch (error) {
      console.error('[Gemini] API error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }
}
