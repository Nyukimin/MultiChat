import { AIProvider, BaseProviderParameters, ProviderConfig } from '../base/ai-provider';
import { ErrorCode, ProviderError } from '../base/provider-error';
import { isDebugMode } from '@/app/lib/config';

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
  options?: OllamaOptions;
}

export class OllamaProvider extends AIProvider<OllamaParameters> {
  private readonly baseUrl: string;
  private readonly defaultModel: string = 'hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S';
  private readonly defaultOptions: OllamaOptions = {
    temperature: 0.7,
    top_k: 40,
    top_p: 0.9,
    repeat_penalty: 1.1
  };

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

      if (isDebugMode()) {
        console.log('[Ollama] リクエスト開始', {
          model,
          options,
          timestamp: new Date().toISOString()
        });
      }

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
        throw new ProviderError(
          ErrorCode.API_ERROR,
          `Ollamaサーバーエラー: ${response.status} ${response.statusText}`,
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

      // thisをキャプチャ
      const processChunk = this.processChunk.bind(this);

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
                try {
                  const result = await processChunk(line);
                  if (result) {
                    if (result.done) {
                      controller.enqueue('data: [DONE]\n\n');
                      break;
                    }
                    if (result.content) {
                      controller.enqueue(`data: ${JSON.stringify({ text: result.content })}\n\n`);
                    }
                  }
                } catch (error) {
                  console.error('[Ollama] ストリーム処理エラー:', error);
                  controller.error(error);
                  break;
                }
              }

              if (done) {
                controller.close();
                break;
              }
            }
          } catch (error) {
            console.error('[Ollama] ストリームエラー:', error);
            controller.error(error);
          }
        },
      });
    } catch (error) {
      console.error('[Ollama] リクエストエラー:', error);
      throw error;
    }
  }
}
