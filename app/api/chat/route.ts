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
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');
  const llm = searchParams.get('llm');

  if (!prompt || !llm) {
    return NextResponse.json(
      { error: 'パラメータが不足しています' }, 
      { status: 400 }
    );
  }

  try {
    const llmType = convertLLMType(llm);
    const response = await client.generate(prompt, llmType);
    return NextResponse.json(response, { status: 200 });
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
