import { NextRequest } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';
import config from '@/app/lib/config/config';

type SupportedProvider = 'claude' | 'gemini' | 'ollama';

// 初期化済みのプロバイダーを保持
const initializedProviders = new Map<SupportedProvider, any>();

// レートリミッターの設定
const rateLimiters: Record<SupportedProvider, RateLimiter> = {
  claude: new RateLimiter({
    requestsPerMinute: config.api.anthropic.rateLimit.requestsPerMinute,
    maxConcurrent: config.api.anthropic.rateLimit.maxConcurrent
  }),
  gemini: new RateLimiter({
    requestsPerMinute: config.api.gemini.rateLimit.requestsPerMinute,
    maxConcurrent: config.api.gemini.rateLimit.maxConcurrent
  }),
  ollama: new RateLimiter({
    requestsPerMinute: config.ollama.rateLimit.requestsPerMinute,
    maxConcurrent: config.ollama.rateLimit.maxConcurrent
  })
};

// プロバイダー毎の送信済フラグ（FALSE:送信可、TRUE:再送信不可）
const sentFlags = new Map<SupportedProvider, boolean>();

// 各プロバイダーの送信済フラグを初期化（初期状態はTRUE:再送信不可）
for (const provider of ['claude', 'gemini', 'ollama'] as const) {
  sentFlags.set(provider, true);
}

// 送信済フラグの制御
function handleSentFlag(provider: SupportedProvider): void {
  if (sentFlags.get(provider)) {
    throw new ProviderError(
      ErrorCode.RATE_LIMIT_ERROR,
      `${provider}は既に送信済みです`,
      'API'
    );
  }
  // 送信後にTRUE（再送信不可）
  sentFlags.set(provider, true);
}

// プロバイダーの初期化
try {
  // Anthropic APIキーの確認と登録
  console.log('[API] 設定確認:', {
    anthropicKeyLength: config.api.anthropic.apiKey.length,
    anthropicKeyPrefix: config.api.anthropic.apiKey.substring(0, 15),
    baseUrl: config.api.anthropic.baseUrl,
  });

  if (config.api.anthropic.apiKey) {
    const claudeProvider = ProviderFactory.createProvider('claude', {
      apiKey: config.api.anthropic.apiKey,
      parameters: {
        model: config.api.anthropic.model,
        maxTokens: config.api.anthropic.maxTokens,
        temperature: config.api.anthropic.temperature,
      }
    });
    initializedProviders.set('claude', claudeProvider);
  }

  // Gemini APIキーの確認と登録
  if (config.api.gemini.apiKey) {
    const geminiProvider = ProviderFactory.createProvider('gemini', {
      apiKey: config.api.gemini.apiKey,
      parameters: {
        model: config.api.gemini.model,
        maxTokens: config.api.gemini.maxTokens,
        temperature: config.api.gemini.temperature,
      }
    });
    initializedProviders.set('gemini', geminiProvider);
  }

  // Ollama設定の確認と登録
  if (config.ollama.baseUrl) {
    const ollamaProvider = ProviderFactory.createProvider('ollama', {
      parameters: {
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.model,
        maxTokens: config.ollama.maxTokens,
      }
    });
    initializedProviders.set('ollama', ollamaProvider);
  }
} catch (error) {
  console.error('Failed to initialize providers:', error);
}

// EventSourceはGETメソッドのみをサポートするため、POSTメソッドは提供しない
// Server-Sent Events (SSE)を使用してAIプロバイダーからのストリーミングレスポンスを実現
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get('prompt');
    const llm = searchParams.get('llm');

    if (!prompt || !llm) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        'プロンプトとLLMの指定は必須です',
        'API'
      );
    }

    const providerType = llm.toLowerCase() as SupportedProvider;

    // プロバイダー固有のレートリミッターを使用
    const limiter = rateLimiters[providerType];
    if (!limiter) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        '不明なプロバイダーです',
        'API'
      );
    }

    const canProceed = await limiter.acquire();
    if (!canProceed) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        'レート制限を超過しました',
        'API'
      );
    }

    try {
      // 送信ボタン押下時に送信済フラグをFALSE（送信可）に設定
      sentFlags.set(providerType, false);
      
      // 送信済フラグを制御
      handleSentFlag(providerType);

      // 初期化済みのプロバイダーを取得
      const provider = initializedProviders.get(providerType);
      if (!provider) {
        throw new ProviderError(
          ErrorCode.CONFIGURATION_ERROR,
          `プロバイダー ${providerType} は初期化されていません`,
          'API'
        );
      }

      const stream = await provider.streamChat(prompt);

      const response = new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Accel-Buffering': 'no'
        },
      });

      return response;
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      throw error;
    } finally {
      limiter.release();
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
