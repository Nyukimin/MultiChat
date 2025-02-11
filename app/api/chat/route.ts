'use server';

import { NextRequest, NextResponse } from 'next/server';
import { LLMClientFactory } from '@/app/lib/ai_clients/factory';
import { LLMType, MessageContent } from '@/app/lib/types/ai';

export async function POST(request: NextRequest) {
  try {
    const { prompt, llm } = await request.json();

    const client = LLMClientFactory.getClient(llm as LLMType);
    const message: MessageContent = {
      role: 'user',
      content: prompt,
    };

    const response = await client.generate(message);
    return NextResponse.json(response);
  } catch (error) {
    console.error('チャット処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: 'チャット処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
