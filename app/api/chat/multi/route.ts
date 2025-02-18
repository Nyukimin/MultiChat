import { NextRequest } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';
import config from '@/app/lib/config/config';
import { SupportedProvider } from '@/app/lib/types/provider';

// 重複リクエストチェック用のマップ
const lastRequests = new Map<string, { timestamp: number }>();
const DUPLICATE_THRESHOLD_MS = 1000; // 1秒以内の同一プロンプトは重複とみなす

// プロバイダーの初期化
let providers: Record<SupportedProvider, any> = {};
try {
  providers = ProviderFactory.createProviders();
} catch (error) {
  console.error('Failed to initialize providers:', error);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get('prompt');
    const llms = searchParams.get('llms')?.split(',');

    if (!prompt || !llms || !Array.isArray(llms) || llms.length === 0) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        'プロンプトとLLMの指定は必須です',
        'API'
      );
    }

    // 重複リクエストのチェック
    const key = prompt;
    const lastRequest = lastRequests.get(key);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest.timestamp) < DUPLICATE_THRESHOLD_MS) {
      throw new ProviderError(
        ErrorCode.RATE_LIMIT_ERROR,
        '同一のプロンプトが短時間に複数回送信されました',
        'API'
      );
    }
    
    lastRequests.set(key, { timestamp: now });
    
    // 古いリクエスト履歴のクリーンアップ
    for (const [key, value] of lastRequests.entries()) {
      if (now - value.timestamp > DUPLICATE_THRESHOLD_MS * 2) {
        lastRequests.delete(key);
      }
    }

    // 各LLMに対して並列でストリーミングレスポンスを生成
    const streams = await Promise.all(
      llms.map(async (llm) => {
        const providerType = llm.toLowerCase() as SupportedProvider;
        const provider = providers[providerType];
        
        if (!provider) {
          throw new ProviderError(
            ErrorCode.VALIDATION_ERROR,
            `プロバイダー ${providerType} は利用できません`,
            'API'
          );
        }

        return provider.streamChat(prompt);
      })
    );

    const response = new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streams) {
              controller.enqueue(chunk);
            }
          } catch (error) {
            console.error('Error in stream:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Accel-Buffering': 'no'
        },
      }
    );

    return response;

  } catch (error) {
    console.error('Error in multi chat endpoint:', error);
    
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
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
