import { NextRequest, NextResponse } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderConfig } from '@/app/lib/providers/base/ai-provider';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';

// ストリーミングレスポンスのエンコーダー
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const { provider, message, config } = await req.json();

    // プロバイダーの初期化
    const llmProvider = await ProviderFactory.createProvider(provider, config as ProviderConfig);

    // ストリーミングレスポンスの設定
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // 非同期でレスポンスを処理
    (async () => {
      try {
        for await (const chunk of llmProvider.generate(message)) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
      } catch (error) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    // ストリーミングレスポンスを返す
    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
