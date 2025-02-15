import { Anthropic } from '@anthropic-ai/sdk';
import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ProviderError, ErrorCode } from '../base/provider-error';

export class ClaudeProvider extends AIProvider {
  private client: Anthropic;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    console.log('[Claude] Initializing provider with config:', {
      model: config.parameters.model,
      maxTokens: config.parameters.maxTokens,
      apiKeyLength: config.apiKey?.length
    });

    try {
      if (!config.apiKey) {
        throw new ProviderError(
          ErrorCode.CONFIGURATION_ERROR,
          'Anthropic API key is not configured',
          'Claude'
        );
      }

      super(config);
      this.config = config;
      this.client = new Anthropic({
        apiKey: config.apiKey
      });

      console.log('[Claude] Provider initialized successfully');
    } catch (error) {
      console.error('[Claude] Initialization error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    console.log('[Claude] Starting chat stream:', {
      promptLength: prompt.length,
      model: this.config.parameters.model,
      apiKeyPreview: this.config.apiKey?.slice(0, 5)
    });

    try {
      const response = await this.client.messages.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.config.parameters.model || 'claude-3-opus-20240229',
        max_tokens: this.config.parameters.maxTokens || 1024,
        stream: true
      });

      console.log('[Claude] API response initialized:', {
        status: 'streaming',
        timestamp: new Date().toISOString()
      });

      return new ReadableStream({
        async start(controller) {
          console.log('[Claude] Stream start');
          try {
            for await (const chunk of response) {
              console.log('[Claude] Received chunk:', {
                type: chunk.type,
                contentType: chunk.content ? typeof chunk.content : 'undefined',
                timestamp: new Date().toISOString()
              });

              if (chunk.type === 'message_start') {
                console.log('[Claude] Message started');
              } else if (chunk.type === 'content_block_start') {
                console.log('[Claude] Content block started');
              } else if (chunk.type === 'content_block_delta') {
                const text = chunk.delta?.text;
                if (text) {
                  console.log('[Claude] Processing text chunk:', {
                    length: text.length,
                    preview: text.slice(0, 50)
                  });
                  controller.enqueue(text);
                }
              } else if (chunk.type === 'content_block_stop') {
                console.log('[Claude] Content block completed');
              } else if (chunk.type === 'message_stop') {
                console.log('[Claude] Message completed');
                controller.close();
                break;
              }
            }
          } catch (error) {
            console.error('[Claude] Stream processing error:', {
              message: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
            controller.error(error);
          }
        },
        cancel() {
          console.log('[Claude] Stream cancelled');
          // ストリームがキャンセルされた場合の処理
        }
      });
    } catch (error) {
      console.error('[Claude] API error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }
}
