import { NextRequest } from 'next/server';
import { ProviderRegistry } from '@/app/lib/providers/base/provider-registry';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { ClaudeProvider } from '@/app/lib/providers/claude/claude-provider';
import { GeminiProvider } from '@/app/lib/providers/gemini/gemini-provider';
import { getEnv, isDebugMode } from '@/app/lib/config';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';

// レートリミッターの設定
const rateLimiter = new RateLimiter({
  maxRequests: 10,  // 最大リクエスト数を増やす
  interval: 1000,   // インターバルを1秒に設定
  timeout: 5000     // タイムアウトを5秒に設定
});

// プロバイダーの初期化と登録
const registry = ProviderRegistry.getInstance();

try {
  // Anthropic APIキーの確認と登録
  const anthropicConfig = getEnv('anthropic');
  if (anthropicConfig.apiKey) {
    registry.registerProvider('claude', new ClaudeProvider({
      apiKey: anthropicConfig.apiKey,
      parameters: {
        model: anthropicConfig.model,
        maxTokens: anthropicConfig.maxTokens
      }
    }));
    if (isDebugMode()) {
      console.log('[API] Claude provider registered successfully');
    }
  }

  // Gemini APIキーの確認と登録
  const geminiConfig = getEnv('gemini');
  if (geminiConfig.apiKey) {
    registry.registerProvider('gemini', new GeminiProvider({
      apiKey: geminiConfig.apiKey,
      parameters: {
        model: geminiConfig.model,
        maxTokens: geminiConfig.maxTokens
      }
    }));
    if (isDebugMode()) {
      console.log('[API] Gemini provider registered successfully');
    }
  }
} catch (error) {
  console.error('[API] Provider initialization error:', error);
  throw new ProviderError(
    ErrorCode.INITIALIZATION_ERROR,
    'Failed to initialize providers',
    error
  );
}

export async function POST(request: NextRequest) {
  try {
    // レートリミットのチェック
    console.log('[API] Checking rate limit...');
    const canProceed = await rateLimiter.acquire();
    console.log('[API] Rate limit check result:', {
      canProceed,
      currentRequests: rateLimiter.currentRequests,
      timestamp: new Date().toISOString()
    });

    if (!canProceed) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        'リクエストが多すぎます。しばらく待って再試行してください',
        'API'
      );
    }

    try {
      const { prompt, llm } = await request.json();

      // 入力チェック
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new ProviderError(
          ErrorCode.INVALID_REQUEST,
          '質問を入力してください',
          'API'
        );
      }

      if (!llm || typeof llm !== 'string') {
        throw new ProviderError(
          ErrorCode.INVALID_REQUEST,
          'LLMを選択してください',
          'API'
        );
      }

      // プロバイダの取得
      const provider = registry.getProvider(llm.toLowerCase());

      // ストリーミングレスポンスの生成
      console.log('Starting stream for LLM:', llm);
      console.log('Prompt:', prompt.slice(0, 50) + '...');
      
      const stream = await provider.streamChat(prompt);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      });
    } finally {
      // リクエスト完了時にレートリミットを解放
      rateLimiter.release();
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    if (error instanceof ProviderError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: error.code === ErrorCode.RATE_LIMIT_ERROR ? 429 : 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    console.log('[API] Received request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers)
    });

    const searchParams = new URLSearchParams(new URL(request.url).search);
    const prompt = searchParams.get('prompt');
    const llm = searchParams.get('llm')?.toLowerCase();

    console.log('[API] Parsed parameters:', {
      prompt,
      llm,
      timestamp: new Date().toISOString()
    });

    if (!prompt || !llm) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required parameters: prompt or llm',
        'API'
      );
    }

    // レートリミットのチェック
    console.log('[API] Checking rate limit...');
    const canProceed = await rateLimiter.acquire();
    console.log('[API] Rate limit check result:', {
      canProceed,
      currentRequests: rateLimiter.currentRequests,
      timestamp: new Date().toISOString()
    });

    if (!canProceed) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        'Too many requests. Please wait a moment before trying again.',
        'RateLimiter'
      );
    }

    try {
      console.log('[API] Getting provider for:', llm);
      const provider = registry.getProvider(llm);
      
      if (!provider) {
        throw new ProviderError(
          ErrorCode.PROVIDER_NOT_FOUND,
          `Provider not found for LLM: ${llm}`,
          'API'
        );
      }

      console.log('[API] Selected provider:', {
        name: llm,
        config: provider.config,
        availableMethods: Object.keys(provider)
      });

      // チャットストリームの作成
      console.log('[API] Creating chat stream with prompt:', prompt.slice(0, 50));
      const chatStream = await provider.streamChat(prompt);
      console.log('[API] Chat stream created successfully');

      // ストリーム変換の設定
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          console.log('[Stream] Processing chunk:', {
            type: typeof chunk,
            length: chunk?.length,
            preview: typeof chunk === 'string' ? chunk.slice(0, 50) : 'non-string chunk'
          });

          try {
            let text;
            if (typeof chunk === 'string') {
              text = chunk;
            } else if (chunk instanceof Uint8Array) {
              text = new TextDecoder().decode(chunk);
            } else {
              console.warn('[Stream] Unexpected chunk type:', typeof chunk);
              return;
            }

            console.log('[Stream] Transformed text:', {
              length: text.length,
              preview: text.slice(0, 100)
            });

            if (text.trim()) {
              const message = `data: ${JSON.stringify({ text })}\n\n`;
              controller.enqueue(encoder.encode(message));
            }
          } catch (error) {
            console.error('[Stream] Transform error:', {
              error: error.message,
              stack: error.stack,
              chunkType: typeof chunk
            });
            throw error;
          }
        },
        flush(controller) {
          console.log('[Stream] Stream completed');
          const message = `data: [DONE]\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      });

      // ストリームの連結
      const responseStream = chatStream.pipeThrough(transformStream);
      console.log('[API] Stream pipeline established');

      // レスポンスの返却
      const response = new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      console.log('[API] Response created:', {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        timestamp: new Date().toISOString()
      });

      return response;

    } catch (error) {
      console.error('[API] Provider error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    } finally {
      rateLimiter.release();
    }

  } catch (error) {
    console.error('[API] Request error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      url: request.url
    });

    // エラーレスポンスの返却
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal Server Error',
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      }),
      {
        status: error.code === ErrorCode.RATE_LIMIT_ERROR ? 429 : 500,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}
