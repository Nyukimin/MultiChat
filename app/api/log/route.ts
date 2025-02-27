import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/app/lib/utils/server-logger';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// セッションごとのログファイルパスを保存するマップ
const sessionLogFiles = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { level, message, requestId, sessionId } = data;
    
    if (!sessionId) {
      serverLogger.warn('セッションIDなしでクライアントログを受信しました');
      return NextResponse.json({ error: 'セッションIDが必要です' }, { status: 400 });
    }
    
    // サーバーログにクライアントからのログを記録
    serverLogger.debug(`クライアントログを受信: ${level} - ${message} ${requestId ? `[${requestId}]` : ''} [セッション: ${sessionId}]`);
    
    // クライアントログをファイルに書き込む
    try {
      const logDir = path.resolve(process.cwd(), 'logs');
      
      // ログフォルダが存在しない場合は作成
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // セッションのログファイルパスを取得または作成
      let logFilePath = sessionLogFiles.get(sessionId);
      
      if (!logFilePath) {
        // 新しいセッションの場合は新しいログファイルを作成
        const timestamp = format(new Date(), 'yyyy_MMdd_HHmmss');
        const logFileName = `client_${timestamp}_${sessionId}.txt`;
        logFilePath = path.join(logDir, logFileName);
        
        // セッションとログファイルパスをマッピング
        sessionLogFiles.set(sessionId, logFilePath);
        
        // セッション開始のログを記録
        const sessionStartLog = `[${new Date().toISOString()}] [SESSION_START] セッション開始: ${sessionId}\n`;
        fs.writeFileSync(logFilePath, sessionStartLog);
        
        serverLogger.info(`新しいクライアントログセッションを開始: ${sessionId} -> ${logFilePath}`);
      }
      
      // タイムスタンプを含むログエントリを作成
      const now = new Date().toISOString();
      const reqIdStr = requestId ? `[${requestId}] ` : '';
      const logEntry = `[${now}] [${level}] ${reqIdStr}${message}\n`;
      
      // ファイルに追記
      fs.appendFileSync(logFilePath, logEntry);
    } catch (error) {
      serverLogger.error(`クライアントログの保存に失敗: ${error}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    serverLogger.error(`ログAPIエラー: ${error}`);
    return NextResponse.json({ error: 'ログの処理に失敗しました' }, { status: 500 });
  }
}
