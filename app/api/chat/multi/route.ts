import { NextRequest, NextResponse } from 'next/server';
import { APIClient } from '@/app/lib/api/client';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';

const client = new APIClient();
const providerFactory = new ProviderFactory();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');
  const providers = searchParams.get('providers')?.split(',') || [];

  if (!prompt || providers.length === 0) {
    return NextResponse.json(
      { error: 'パラメータが不足しています' }, 
      { status: 400 }
    );
  }

  try {
    const streams = await Promise.all(
      providers.map(async (providerName) => {
        const stream = client.generate(prompt, providerName as 'anthropic' | 'gemini' | 'ollama');
        return { provider: providerName, stream };
      })
    );

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for (const { provider, stream } of streams) {
              controller.enqueue(`Provider: ${provider}\n`);
              for await (const chunk of stream) {
                controller.enqueue(chunk);
              }
              controller.enqueue('\n\n');
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked'
        }
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内部サーバーエラー' }, 
      { status: 500 }
    );
  }
}

// 他のHTTPメソッドへの対応を防ぐ
export function POST() {
  return NextResponse.json(
    { error: 'GETメソッドのみサポートしています' }, 
    { status: 405 }
  );
}

export function PUT() {
  return NextResponse.json(
    { error: 'GETメソッドのみサポートしています' }, 
    { status: 405 }
  );
}

export function DELETE() {
  return NextResponse.json(
    { error: 'GETメソッドのみサポートしています' }, 
    { status: 405 }
  );
}
