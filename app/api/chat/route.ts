import { NextRequest } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { getEnv, isDebugMode } from '@/app/lib/config';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';
import { getOllamaConfig } from '@/app/lib/providers/ollama/config';

type SupportedProvider = 'claude' | 'gemini' | 'ollama';

// レートリミッターの設定
const rateLimiters: Record<SupportedProvider, RateLimiter> = {
  claude: new RateLimiter({
    requestsPerMinute: 20,
    maxConcurrent: 5
  }),
  gemini: new RateLimiter({
    requestsPerMinute: 30,
    maxConcurrent: 5
  }),
  ollama: new RateLimiter({
    requestsPerMinute: 60,
    maxConcurrent: 10
  })
};

// プロバイダーの初期化
try {
  // Anthropic APIキーの確認と登録
  const anthropicConfig = getEnv('anthropic');
  if (anthropicConfig.apiKey) {
    ProviderFactory.createProvider('claude', {
      name: 'claude',
      apiKey: anthropicConfig.apiKey,
      parameters: {
        model: anthropicConfig.model,
        maxTokens: anthropicConfig.maxTokens
      }
    });
    if (isDebugMode()) {
      console.log('[API] Claude provider registered successfully');
    }
  }

  // Gemini APIキーの確認と登録
  const geminiConfig = getEnv('gemini');
  if (geminiConfig.apiKey) {
    ProviderFactory.createProvider('gemini', {
      name: 'gemini',
      apiKey: geminiConfig.apiKey,
      parameters: {
        model: geminiConfig.model,
        maxTokens: geminiConfig.maxTokens
      }
    });
    if (isDebugMode()) {
      console.log('[API] Gemini provider registered successfully');
    }
  }

  // Ollama設定の確認と登録
  const ollamaConfig = getOllamaConfig();
  if (ollamaConfig.baseUrl) {
    ProviderFactory.createProvider('ollama', {
      name: 'ollama',
      parameters: {
        baseUrl: ollamaConfig.baseUrl,
        model: ollamaConfig.model,
        maxTokens: ollamaConfig.maxTokens
      }
    });
    if (isDebugMode()) {
      console.log('[API] Ollama provider registered successfully');
    }
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
        providerConfig = getOllamaConfig();
      } else {
        providerConfig = getEnv(providerType);
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
        providerConfig = getOllamaConfig();
      } else {
        providerConfig = getEnv(llm);
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
