import { AIProvider, BaseProviderParameters, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';
import { isDebugMode } from '@/app/lib/config';
import { OllamaConfig, defaultConfig } from './config';

interface OllamaOptions {
  temperature?: number;
  top_k?: number;
  top_p?: number;
  repeat_penalty?: number;
  num_predict?: number;
}

interface OllamaParameters extends BaseProviderParameters {
  model?: string;
  baseUrl: string;
  options?: OllamaConfig['options'];
}

export class OllamaProvider extends AIProvider<OllamaParameters> {
  private readonly baseUrl: string;
  private readonly defaultModel: string = defaultConfig.model;
  private readonly defaultOptions: OllamaConfig['options'] = defaultConfig.options;

  constructor(config: ProviderConfig<OllamaParameters>) {
    super(config);
    
    const { baseUrl, model, options } = config.parameters;
    if (!baseUrl) {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Ollama base URL is not configured',
        'Ollama'
      );
    }
    this.baseUrl = baseUrl;

    // モデル名のバリデーション
    if (model && typeof model !== 'string') {
      throw new ProviderError(
        ErrorCode.CONFIGURATION_ERROR,
        'Invalid model parameter type',
        'Ollama'
      );
    }
  }

  private async processChunk(chunk: string) {
    try {
      // データプレフィックスの除去
      const cleaned = chunk.replace(/^data: /, '').trim();
      
      // 特殊な終了シグナルのチェック
      if (cleaned === '[DONE]' || cleaned === 'Done: true') {
        return { done: true };
      }
      
      // 空のチャンクをスキップ
      if (!cleaned) {
        return null;
      }

      // JSONパース
      const parsed = JSON.parse(cleaned);
      
      // レスポンスの抽出
      return {
        content: parsed.response || '',
        done: parsed.done || false
      };
    } catch (error) {
      console.error('[Ollama] チャンク解析エラー:', error, 'チャンク:', chunk);
      throw new ProviderError(
        ErrorCode.PARSING_ERROR,
        'レスポンスの解析に失敗しました',
        'Ollama'
      );
    }
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      const model = this.config.parameters.model || this.defaultModel;
      const options = this.config.parameters.options || this.defaultOptions;

      console.log('[Ollama] リクエスト開始', {
        model,
        options,
        baseUrl: this.baseUrl,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Ollama] APIエラー詳細:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody
        });
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Ollamaサーバーエラー: ${response.status} ${response.statusText}\n${errorBody}`,
          'Ollama'
        );
      }

      if (!response.body) {
        throw new ProviderError(
          ErrorCode.STREAM_ERROR,
          'ストリームの初期化に失敗しました',
          'Ollama'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastResponseTime = Date.now();
      const RESPONSE_TIMEOUT = 10000; // 10秒のタイムアウト

      // thisをキャプチャ
      const processChunk = this.processChunk.bind(this);

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                if (isDebugMode) {
                  console.log('[Ollama] ストリーム終了');
                }
                controller.close();
                break;
              }

              const now = Date.now();
              if (now - lastResponseTime > RESPONSE_TIMEOUT) {
                console.error('[Ollama] タイムアウト - 応答が遅すぎます');
                controller.close();
                break;
              }
              lastResponseTime = now;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              if (isDebugMode) {
                console.log('[Ollama] 受信データ:', lines);
              }

              for (const line of lines) {
                if (line.trim() === '') continue;

                if (isDebugMode) {
                  console.log('[Ollama] 処理中のライン:', line);
                }

                try {
                  const result = await processChunk(line);
                  if (result) {
                    if (result.done) {
                      if (isDebugMode) {
                        console.log('[Ollama] 完了シグナル受信');
                      }
                      controller.enqueue('data: [DONE]\n\n');
                      break;
                    }
                    if (result.content) {
                      const transformedData = { text: result.content };
                      if (isDebugMode) {
                        console.log('[Ollama] 変換後データ:', transformedData);
                      }
                      controller.enqueue(`data: ${JSON.stringify(transformedData)}\n\n`);
                    }
                  }
                } catch (error) {
                  console.error('[Ollama] JSONパースエラー:', error, 'ライン:', line);
                }
              }

              if (done) {
                controller.close();
                break;
              }
            }
          } catch (error) {
            console.error('[Ollama] ストリーム処理エラー:', error);
            controller.error(error);
          }
        },
      });
    } catch (error) {
      console.error('[Ollama] 全体エラー:', error);
      throw error;
    }
  }
}
