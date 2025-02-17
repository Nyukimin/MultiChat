import { NextRequest } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';
import config from '@/app/lib/config/config';

type SupportedProvider = 'claude' | 'gemini' | 'ollama';

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

// 重複リクエストチェック用のマップ
const lastRequests = new Map<string, { prompt: string; timestamp: number }>();
const DUPLICATE_THRESHOLD_MS = 1000; // 1秒以内の同一プロンプトは重複とみなす

// プロバイダーの初期化
try {
  // Anthropic APIキーの確認と登録
  console.log('[API] 設定確認:', {
    anthropicKeyLength: config.api.anthropic.apiKey.length,
    anthropicKeyPrefix: config.api.anthropic.apiKey.substring(0, 15),
    baseUrl: config.api.anthropic.baseUrl,
  });

  if (config.api.anthropic.apiKey) {
    ProviderFactory.createProvider('claude', {
      apiKey: config.api.anthropic.apiKey,
      parameters: {
        model: config.api.anthropic.model,
        maxTokens: config.api.anthropic.maxTokens,
        temperature: config.api.anthropic.temperature,
      }
    });
  }

  // Gemini APIキーの確認と登録
  if (config.api.gemini.apiKey) {
    ProviderFactory.createProvider('gemini', {
      apiKey: config.api.gemini.apiKey,
      parameters: {
        model: config.api.gemini.model,
        maxTokens: config.api.gemini.maxTokens,
        temperature: config.api.gemini.temperature,
      }
    });
  }

  // Ollama設定の確認と登録
  if (config.ollama.baseUrl) {
    ProviderFactory.createProvider('ollama', {
      parameters: {
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.model,
        maxTokens: config.ollama.maxTokens,
      }
    });
  }
} catch (error) {
  console.error('Failed to initialize providers:', error);
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, llm } = await request.json();

    if (!prompt || !llm) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        'プロンプトとLLMの指定は必須です',
        'API'
      );
    }

    const providerType = llm.toLowerCase() as SupportedProvider;

    // 重複リクエストのチェック
    const key = `${providerType}:${prompt}`;
    const lastRequest = lastRequests.get(key);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest.timestamp) < DUPLICATE_THRESHOLD_MS) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        '同一のリクエストが短時間に複数回送信されました',
        'API'
      );
    }
    
    lastRequests.set(key, { prompt, timestamp: now });
    
    // 古いリクエスト履歴のクリーンアップ
    for (const [key, value] of lastRequests.entries()) {
      if (now - value.timestamp > DUPLICATE_THRESHOLD_MS * 2) {
        lastRequests.delete(key);
      }
    }
    
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
      let providerConfig;
      if (providerType === 'ollama') {
        providerConfig = config.ollama;
      } else {
        providerConfig = config.api[providerType];
      }

      const provider = ProviderFactory.createProvider(providerType, {
        name: providerType,
        parameters: providerConfig
      });

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get('prompt');
    const llm = searchParams.get('llm')?.toLowerCase() as SupportedProvider;

    if (!prompt || !llm) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        'プロンプトとLLMの指定は必須です',
        'API'
      );
    }

    // 重複リクエストのチェック
    const key = `${llm}:${prompt}`;
    const lastRequest = lastRequests.get(key);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest.timestamp) < DUPLICATE_THRESHOLD_MS) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        '同一のリクエストが短時間に複数回送信されました',
        'API'
      );
    }
    
    lastRequests.set(key, { prompt, timestamp: now });
    
    // 古いリクエスト履歴のクリーンアップ
    for (const [key, value] of lastRequests.entries()) {
      if (now - value.timestamp > DUPLICATE_THRESHOLD_MS * 2) {
        lastRequests.delete(key);
      }
    }
    
    // プロバイダー固有のレートリミッターを使用
    const limiter = rateLimiters[llm];
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
      let providerConfig;
      if (llm === 'ollama') {
        providerConfig = config.ollama;
      } else {
        providerConfig = config.api[llm];
      }

      const provider = ProviderFactory.createProvider(llm, {
        name: llm,
        parameters: providerConfig
      });
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
