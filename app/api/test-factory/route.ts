import { NextResponse } from 'next/server';
import { LLMClientFactory } from '../../lib/ai_clients/factory';
import { LLMType } from '../../lib/types/ai';

export async function GET() {
  const results = [];

  try {
    // 1. 正常系：Anthropicクライアントの生成
    const client1 = await LLMClientFactory.getInstance('anthropic');
    const client2 = await LLMClientFactory.getInstance('anthropic');
    results.push({
      test: 'シングルトン確認',
      result: client1 === client2 ? '成功' : '失敗'
    });

    // 2. 異常系：未対応のLLMタイプを指定
    try {
      await LLMClientFactory.getInstance('unknown' as LLMType);
      results.push({
        test: '未対応LLMタイプ',
        result: 'エラー発生せず（異常）'
      });
    } catch (error) {
      results.push({
        test: '未対応LLMタイプ',
        result: `正常にエラー発生: ${(error as Error).message}`
      });
    }

  } catch (error) {
    return NextResponse.json({
      error: '予期せぬエラーが発生',
      message: (error as Error).message
    }, { status: 500 });
  }

  return NextResponse.json({ results });
}
