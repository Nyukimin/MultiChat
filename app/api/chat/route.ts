import { NextRequest, NextResponse } from 'next/server';
import { APIClient } from '@/app/lib/api/client';

const client = new APIClient();

// LLMタイプの変換関数
function convertLLMType(type: string): 'anthropic' | 'gemini' | 'ollama' {
  switch (type.toLowerCase()) {
    case 'claude':
    case 'anthropic':
      return 'anthropic';
    case 'gemini':
    case 'bard':
      return 'gemini';
    case 'ollama':
      return 'ollama';
    default:
      throw new Error(`サポートされていないLLMタイプです: ${type}`);
  }
}

export async function GET(request: NextRequest) {
  console.log('🌐 API Route: チャットリクエスト受信');
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');
  const llm = searchParams.get('llm');

  console.log(`📨 受信パラメータ - プロンプト: ${prompt}, LLM: ${llm}`);

  if (!prompt || !llm) {
    return NextResponse.json(
      { error: 'パラメータが不足しています' }, 
      { status: 400 }
    );
  }

  try {
    const llmType = convertLLMType(llm);
    console.log(`🔍 LLMタイプ: ${llmType}`);

    const stream = client.generate(prompt, llmType);
    console.log('🚀 ストリーム生成: ', stream !== null);

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              controller.enqueue(chunk);
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
    console.error('❌ チャットストリーム生成エラー:', error);
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
