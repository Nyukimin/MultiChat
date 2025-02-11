import { NextResponse } from 'next/server';
import { HistoryManager } from '@/app/lib/utils/historyManager';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const history = await HistoryManager.getHistory(params.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error('履歴の取得に失敗しました:', error);
    return NextResponse.json(
      { error: '履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
