import { AIProvider, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';
import config from '../../config/config';

export class ClaudeProvider extends AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(providerConfig: ProviderConfig) {
    super(providerConfig);

    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Claude API key is not configured',
        'Claude'
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = config.api.anthropic.baseUrl;
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      console.log('[Claude] リクエスト開始', {
        model: this.config.parameters.model,
        baseUrl: this.baseUrl,
        apiKeyLength: this.apiKey.length,
        apiKeyPrefix: this.apiKey.substring(0, 15),
        apiKeyFromEnv: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY?.substring(0, 15),
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.parameters.model || config.api.anthropic.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.parameters.maxTokens || config.api.anthropic.maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Claude] APIエラー詳細:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody
        });
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Claudeサーバーエラー: ${response.status} ${response.statusText}\n${errorBody}`,
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
                console.log('[Claude] ストリーム終了');
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              console.log('[Claude] 受信データ:', lines);

              for (const line of lines) {
                if (line.trim() === '') continue;

                console.log('[Claude] 処理中のライン:', line);

                if (line === 'data: [DONE]') {
                  console.log('[Claude] 完了シグナル受信');
                  controller.enqueue('data: [DONE]\n\n');
                  continue;
                }

                if (line.startsWith('data: ')) {
                  try {
                    const jsonData = JSON.parse(line.slice(6));
                    console.log('[Claude] パース済みデータ:', jsonData);
                    
                    // テキストの抽出方法を修正
                    let text = '';
                    if (jsonData.type === 'content_block_delta' && jsonData.delta?.type === 'text_delta') {
                      text = jsonData.delta.text || '';
                    }
                    
                    const transformedData = { text };
                    console.log('[Claude] 変換後データ:', transformedData);
                    
                    if (text) {
                      controller.enqueue('data: ' + JSON.stringify(transformedData) + '\n\n');
                    }
                  } catch (error) {
                    console.error('[Claude] JSONパースエラー:', error, 'ライン:', line);
                  }
                }
              }
            }
          } catch (error) {
            console.error('[Claude] ストリーム処理エラー:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('[Claude] 全体エラー:', error);
      throw error;
    }
  }
}
