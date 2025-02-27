import { NextRequest, NextResponse } from 'next/server';
import { APIClient } from '@/app/lib/api/client';
import { generateRequestId } from '@/app/lib/utils/request-id-generator';
import { serverLogger } from '@/app/lib/utils/server-logger';

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

// APIクライアントのインスタンスを保持
let apiClient: APIClient | null = null;

export async function GET(request: NextRequest) {
  // リクエストIDを生成
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');
  const llm = searchParams.get('llm');
  // クライアントから送られてきたリクエストIDを取得
  const clientRequestId = searchParams.get('requestId');
  
  // リクエストIDが送られてこなかった場合は新しく生成
  const requestId = clientRequestId || generateRequestId();
  
  try {
    serverLogger.info(`🌐 API Route: チャットリクエスト受信 [${requestId}]`);
    serverLogger.info(`📨 受信パラメータ - プロンプト: ${prompt}, LLM: ${llm} [${requestId}]`);

    if (!prompt || !llm) {
      serverLogger.error(`パラメータが不足しています [${requestId}]`);
      return NextResponse.json(
        { error: 'プロンプトとLLMが必要です', requestId }, 
        { status: 400 }
      );
    }

    const llmType = convertLLMType(llm);
    serverLogger.info(`🔍 LLMタイプ: ${llmType} [${requestId}]`);

    serverLogger.info(`🚀 ストリーム生成: [${requestId}]`);

    // APIクライアントの初期化（シングルトンパターン）
    if (!apiClient) {
      // 環境変数から設定を取得
      const config = {
        apiKeys: {
          gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
          anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
        },
        ollama: {
          baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama2',
        }
      };
      apiClient = new APIClient(config);
    }

    if (!apiClient) {
      throw new Error('APIクライアントが初期化されていません');
    }

    // ストリーミングレスポンスの作成
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            // リクエストのAbortSignalを取得
            const signal = request.signal;

            // シグナルが中断されたときのハンドラー
            signal.addEventListener('abort', () => {
              serverLogger.debug('Client disconnected, aborting stream [${requestId}]');
              controller.close();
            });

            // ストリーム生成
            const stream = apiClient.generate(prompt, llmType, requestId);
            
            // 最初にリクエストIDを送信
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({ requestId }) + '\n'));
            
            // チャンクを処理
            for await (const chunk of stream) {
              // クライアントが切断された場合は処理を中断
              if (signal.aborted) {
                serverLogger.debug('Stream aborted due to client disconnect [${requestId}]');
                break;
              }
              
              // チャンクをエンコードして送信（リクエストIDを含める）
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk, requestId }) + '\n'));
            }

            serverLogger.info('Stream completed successfully [${requestId}]');
            controller.close();
          } catch (error) {
            serverLogger.error('ストリーム生成中にエラーが発生しました: ${error} [${requestId}]');
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    );
  } catch (error) {
    serverLogger.error('❌ チャットストリーム生成エラー: ${error} [${requestId}]');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内部サーバーエラー', requestId }, 
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
