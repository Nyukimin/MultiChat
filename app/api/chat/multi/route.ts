import { NextRequest } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';
import { RateLimiter } from '@/app/lib/utils/rate-limiter';
import { getConfig } from '@/app/lib/config/config';
import { SupportedProvider } from '@/app/lib/types/provider';

// 重複リクエストチェック用のマップ
const lastRequests = new Map<string, { timestamp: number }>();
const DUPLICATE_THRESHOLD_MS = 1000; // 1秒以内の同一プロンプトは重複とみなす

// プロバイダーの初期化
let provider: any;
try {
  provider = ProviderFactory.createProvider('anthropic');
} catch (error) {
  console.error('Failed to initialize provider:', error);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get('prompt');
    const llm = searchParams.get('llm') as SupportedProvider;

    if (!prompt || !llm) {
      return new Response(JSON.stringify({
        error: 'プロンプトとLLMの指定は必須です'
      }), { status: 400 });
    }

    // プロバイダーの取得と処理
    if (!provider) {
      return new Response(JSON.stringify({
        error: 'プロバイダーの初期化に失敗しました'
      }), { status: 500 });
    }

    // 重複リクエストのチェック
    const key = prompt;
    const lastRequest = lastRequests.get(key);
    const now = Date.now();

    if (lastRequest && (now - lastRequest.timestamp) < DUPLICATE_THRESHOLD_MS) {
      return new Response(JSON.stringify({
        error: '重複リクエストです'
      }), { status: 429 });
    }

    // レスポンスの生成
    const response = await provider.generate(prompt, llm);
    
    // 成功したリクエストを記録
    lastRequests.set(key, { timestamp: now });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof ProviderError) {
      return new Response(JSON.stringify({
        error: error.message,
        code: error.code
      }), { status: error.code === ErrorCode.RateLimit ? 429 : 500 });
    }
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : '内部サーバーエラー'
    }), { status: 500 });
  }
}
