import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';

export class ClaudeProvider extends AIProvider {
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);

    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Claude API key is not configured',
        'Claude'
      );
    }
    this.apiKey = apiKey;
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      console.log('[Claude] リクエスト開始', {
        model: this.config.parameters.model,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.parameters.model || 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.parameters.maxTokens || 1024,
          stream: true
        })
      });

      if (!response.ok) {
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Claudeサーバーエラー: ${response.status} ${response.statusText}`,
          'Claude'
        );
      }

      if (!response.body) {
        throw new ProviderError(
          ErrorCode.STREAM_ERROR,
          'ストリームの初期化に失敗しました',
          'Claude'
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
                if (line === 'data: [DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const data = JSON.parse(line.replace(/^data: /, ''));
                  if (data.type === 'content_block_delta') {
                    controller.enqueue(data.delta.text);
                  }
                } catch (error) {
                  console.error('[Claude] JSONパースエラー:', error);
                  continue;
                }
              }
            }
          } catch (error) {
            console.error('[Claude] ストリームエラー:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('[Claude] リクエストエラー:', error);
      throw error;
    }
  }
}
