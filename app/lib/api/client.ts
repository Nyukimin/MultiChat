import { getConfig } from '../config/config';
import { logger } from '../utils/logger';
import { serverLogger } from '../utils/server-logger';

// サーバーサイドかクライアントサイドかを判定
const isClient = typeof window !== 'undefined';

// Logger型の定義
interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug?: (message: string, ...args: any[]) => void;
  apiRequest?: (llmType: string, prompt: string, requestId: string) => void;
  apiResponse?: (provider: string, response: string, requestId: string) => void;
}

// 環境に応じたロガーを選択（型安全に）
const log: Logger = {
  info: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    
    isClient 
      ? console.log(`[Client] ${fullMessage}`) 
      : serverLogger?.info(fullMessage) ?? console.log(fullMessage);
  },
  warn: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    
    isClient 
      ? console.warn(`[Client] ${fullMessage}`) 
      : serverLogger?.warn(fullMessage) ?? console.warn(fullMessage);
  },
  error: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    
    isClient 
      ? console.error(`[Client] ${fullMessage}`) 
      : serverLogger?.error(fullMessage) ?? console.error(fullMessage);
  },
  debug: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' 
    ? (message: string, ...args: any[]) => {
        const fullMessage = args.length > 0 
          ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
          : message;
        
        isClient 
          ? console.debug(`[Client] ${fullMessage}`) 
          : serverLogger?.debug(fullMessage) ?? console.debug(fullMessage);
      }
    : undefined,
  apiRequest: (llmType: string, prompt: string, requestId?: string) => {
    log.info(`API Request - LLM: ${llmType}, Request ID: ${requestId ?? 'N/A'}`);
  },
  apiResponse: (provider: string, response: string, requestId?: string) => {
    log.info(`API Response - Provider: ${provider}, Request ID: ${requestId ?? 'N/A'}`);
  }
};

export const AI_MODEL_VERSION = 'Claude-3-Sonnet-20241022';

interface ApiResponse {
  content: string;
  model: string;
  provider: 'anthropic' | 'gemini' | 'ollama';
}

interface APIConfig {
  apiKeys: {
    gemini: string;
    anthropic: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
}

export class APIClient {
  private config: APIConfig;
  private currentAbortController: AbortController | null = null;
  private isProcessingRequest: boolean = false;

  constructor(config?: Partial<APIConfig>) {
    // デフォルト設定
    this.config = {
      apiKeys: {
        gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
        anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
      },
      ollama: {
        baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama2',
      },
      ...config
    };
    
    // 設定の検証
    if (!this.config.apiKeys.gemini) {
      log.warn('Gemini API key is not configured');
    }
    if (!this.config.apiKeys.anthropic) {
      log.warn('Anthropic API key is not configured');
    }
  }

  async *generate(prompt: string, llmType: 'anthropic' | 'gemini' | 'ollama', requestId?: string): AsyncGenerator<string> {
    if (this.isProcessingRequest) {
      throw new Error('前回のリクエストが完了していません。しばらく待ってから再試行してください。');
    }

    this.isProcessingRequest = true;
    const reqId = requestId || 'REQ-UNKNOWN';
    
    try {
      log.info(`APIClient: 生成開始 - LLM: ${llmType}, リクエストID: ${reqId}`);
      log.apiRequest(llmType, prompt, reqId);

      switch (llmType) {
        case 'anthropic':
          yield* this.generateAnthropicStream(prompt, reqId);
          break;
        case 'gemini':
          yield* this.generateGeminiStream(prompt, reqId);
          break;
        case 'ollama':
          yield* this.generateOllamaStream(prompt, reqId);
          break;
        default:
          throw new Error(`サポートされていないLLMタイプです: ${llmType}`);
      }
    } catch (error) {
      log.error(`APIClient: エラー発生 - ${error}`, error instanceof Error ? error : undefined, reqId);
      throw error;
    } finally {
      this.isProcessingRequest = false;
      log.info(`APIClient: 生成完了 - リクエストID: ${reqId}`);
    }
  }

  private async *generateAnthropicStream(prompt: string, requestId: string): AsyncGenerator<string> {
    if (!this.config.apiKeys.anthropic) {
      log.error('Anthropic API key is not configured', undefined, requestId);
      throw new Error('Anthropic API key is not configured');
    }
    
    log.info('Anthropic API リクエスト開始', requestId);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKeys.anthropic,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: true,
          max_tokens: 4000
        }),
        signal: this.currentAbortController?.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Anthropic API エラー: ${response.status} ${response.statusText}`, new Error(errorText), requestId);
        throw new Error(`Anthropic API エラー: ${response.status} ${errorText}`);
      }
      
      if (!response.body) {
        log.error('Anthropic API からのレスポンスボディがありません', undefined, requestId);
        throw new Error('レスポンスボディがありません');
      }
      
      log.info('Anthropic API ストリーム受信開始', requestId);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value);
        
        // イベントごとに処理
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              log.info('Anthropic API ストリーム完了', requestId);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                log.apiResponse('anthropic', text, requestId);
                yield text;
              }
            } catch (e) {
              log.warn(`Anthropic レスポンスのパースに失敗: ${e}`, requestId);
            }
          }
        }
      }
      
      // 残りのバッファを処理
      if (buffer.length > 0) {
        log.debug(`Anthropic 残りのバッファを処理: ${buffer}`, requestId);
      }
      
      log.info('Anthropic API ストリーム処理完了', requestId);
    } catch (error) {
      log.error('Anthropic API 呼び出しエラー', error instanceof Error ? error : undefined, requestId);
      throw error;
    }
  }

  private async *generateGeminiStream(prompt: string, requestId: string): AsyncGenerator<string> {
    if (!this.config.apiKeys.gemini) {
      log.error('Gemini API key is not configured', undefined, requestId);
      throw new Error('Gemini API key is not configured');
    }
    
    log.info('Gemini API リクエスト開始', requestId);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:streamGenerateContent?key=${this.config.apiKeys.gemini}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 8192,
            stopSequences: []
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
        signal: this.currentAbortController?.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Gemini API エラー: ${response.status} ${response.statusText}`, new Error(errorText), requestId);
        throw new Error(`Gemini API エラー: ${response.status} ${errorText}`);
      }
      
      if (!response.body) {
        log.error('Gemini API からのレスポンスボディがありません', undefined, requestId);
        throw new Error('レスポンスボディがありません');
      }
      
      log.info('Gemini API ストリーム受信開始', requestId);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value);
        
        // JSONLフォーマットの処理
        try {
          // バッファから完全なJSONオブジェクトを抽出
          let jsonStartIndex = 0;
          let jsonEndIndex = 0;
          let extractedJson = '';
          
          while (jsonStartIndex < buffer.length) {
            // JSONオブジェクトの開始を見つける
            jsonStartIndex = buffer.indexOf('{', jsonEndIndex);
            if (jsonStartIndex === -1) break;
            
            // JSONオブジェクトの終了を見つける
            let openBraces = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = jsonStartIndex; i < buffer.length; i++) {
              const char = buffer[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\' && inString) {
                escapeNext = true;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') {
                  openBraces++;
                } else if (char === '}') {
                  openBraces--;
                  if (openBraces === 0) {
                    jsonEndIndex = i + 1;
                    extractedJson = buffer.substring(jsonStartIndex, jsonEndIndex);
                    
                    try {
                      const parsed = JSON.parse(extractedJson);
                      
                      if (parsed.candidates && parsed.candidates.length > 0) {
                        const candidate = parsed.candidates[0];
                        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                          const text = candidate.content.parts[0].text;
                          if (text) {
                            log.apiResponse('gemini', text, requestId);
                            yield text;
                          }
                        }
                      }
                    } catch (parseError) {
                      log.error(`Gemini JSON parse error: ${parseError}`, parseError instanceof Error ? parseError : undefined, requestId);
                    }
                    
                    break;
                  }
                }
              }
            }
            
            // 完全なJSONオブジェクトが見つからなかった場合
            if (jsonEndIndex <= jsonStartIndex) {
              break;
            }
          }
          
          // 処理済みの部分をバッファから削除
          if (jsonEndIndex > 0) {
            buffer = buffer.substring(jsonEndIndex);
          }
        } catch (error) {
          log.error(`Gemini stream processing error: ${error}`, error instanceof Error ? error : undefined, requestId);
        }
      }
      
      // 残りのバッファを処理
      if (buffer.length > 0 && buffer !== '[DONE]') {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.candidates && parsed.candidates.length > 0) {
            const candidate = parsed.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              const text = candidate.content.parts[0].text;
              if (text) {
                log.apiResponse('gemini', text, requestId);
                yield text;
              }
            }
          }
        } catch (e) {
          log.warn(`Gemini 最終バッファのパースに失敗: ${e}`, requestId);
        }
      }
      
      log.info('Gemini API ストリーム処理完了', requestId);
    } catch (error) {
      log.error('Gemini API 呼び出しエラー', error instanceof Error ? error : undefined, requestId);
      throw error;
    }
  }

  private async *generateOllamaStream(prompt: string, requestId: string): AsyncGenerator<string> {
    log.info(`Ollama API リクエスト開始 - モデル: ${this.config.ollama.model}`, requestId);
    
    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.ollama.model,
          prompt: prompt,
          stream: true
        }),
        signal: this.currentAbortController?.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Ollama API エラー: ${response.status} ${response.statusText}`, new Error(errorText), requestId);
        throw new Error(`Ollama API エラー: ${response.status} ${errorText}`);
      }
      
      if (!response.body) {
        log.error('Ollama API からのレスポンスボディがありません', undefined, requestId);
        throw new Error('レスポンスボディがありません');
      }
      
      log.info('Ollama API ストリーム受信開始', requestId);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.response) {
              log.apiResponse('ollama', parsed.response, requestId);
              yield parsed.response;
            }
            
            if (parsed.done) {
              log.info('Ollama API ストリーム完了', requestId);
            }
          } catch (e) {
            log.warn(`Ollama レスポンスのパースに失敗: ${line} - ${e}`, requestId);
          }
        }
      }
      
      log.info('Ollama API ストリーム処理完了', requestId);
    } catch (error) {
      log.error('Ollama API 呼び出しエラー', error instanceof Error ? error : undefined, requestId);
      throw error;
    }
  }

  public abortCurrentRequest(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.isProcessingRequest = false;
      this.currentAbortController = null;
    }
  }

  private handleError(error: unknown, requestId?: string): void {
    if (error instanceof Error) {
      log.error(`APIエラー: ${error.message}`, error, requestId);
    } else {
      log.error('不明なエラーが発生しました', undefined, requestId);
    }
  }
}
