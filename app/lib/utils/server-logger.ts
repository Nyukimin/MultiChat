import fs from 'fs';
import path from 'path';

/**
 * サーバーサイド専用のロガー
 * APIルートなどのサーバーサイドコードでのみ使用可能
 */
class ServerLogger {
  private static instance: ServerLogger | null = null;
  private logFilePath: string = '';
  private isEnabled: boolean = true;

  private constructor() {
    try {
      // プロジェクトルートからの相対パス
      const projectRoot = process.cwd();
      const logDir = path.join(projectRoot, 'logs');
      
      // ログディレクトリが存在しない場合は作成
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        console.log(`[ServerLogger] ログディレクトリを作成しました: ${logDir}`);
      }
      
      // 現在の日時を取得して形式化 (YYYY_MMDD_HHmmss)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const timestamp = `${year}_${month}${day}_${hours}${minutes}${seconds}`;
      const logFileName = `server_${timestamp}.txt`;
      
      // ログファイルのフルパスを設定
      this.logFilePath = path.join(logDir, logFileName);
      
      // ファイルが書き込み可能か確認
      fs.writeFileSync(this.logFilePath, '', { flag: 'w' });
      
      // 起動ログを記録
      this.info(`ServerLogger initialized: ${new Date().toISOString()}`);
      this.info(`Log file path: ${this.logFilePath}`);
      console.log(`[ServerLogger] ログファイルを作成しました: ${this.logFilePath}`);
    } catch (error) {
      console.error('[ServerLogger] 初期化エラー:', error);
      // エラー時はコンソールのみに出力するフォールバックモード
      this.logFilePath = '';
    }
  }

  // シングルトンパターンを安全に実装
  public static getInstance(): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger();
    }
    return ServerLogger.instance;
  }

  // nullセーフなメソッド
  public info(message: string, ...args: any[]): void {
    if (!this.isEnabled) return;

    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;

    try {
      // コンソールへのログ出力
      console.log(`[INFO] ${fullMessage}`);

      // ファイルへのログ出力（オプション）
      if (this.logFilePath) {
        fs.appendFileSync(this.logFilePath, `[INFO] ${fullMessage}\n`);
      }
    } catch (error) {
      console.error('[ServerLogger] ログ出力エラー:', error);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (!this.isEnabled) return;

    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;

    console.warn(`[WARN] ${fullMessage}`);
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, `[WARN] ${fullMessage}\n`);
    }
  }

  public error(message: string, ...args: any[]): void {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;

    console.error(`[ERROR] ${fullMessage}`);
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, `[ERROR] ${fullMessage}\n`);
    }
  }

  // デバッグモード用のメソッド
  public debug(message: string, ...args: any[]): void {
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  public apiRequest(provider: string, prompt: string, requestId?: string): void {
    this.log('API_REQUEST', `${provider}：送信：${prompt}`, requestId);
  }

  public apiResponse(provider: string, rawResponse: string, requestId?: string): void {
    this.log('API_RESPONSE', `${provider}：受信：${rawResponse}`, requestId);
  }

  public apiParsedResponse(provider: string, parsedText: string, tokenSpeed: number, requestId?: string): void {
    this.log('API_PARSED', `${provider}：受信：${parsedText}(${tokenSpeed.toFixed(1)} token/sec)`, requestId);
  }

  public apiError(provider: string, error: any, requestId?: string): void {
    this.log('API_ERROR', `${provider}：エラー：${error}`, requestId);
  }

  private log(level: string, message: string, requestId?: string): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const logEntry = `[${timestamp}] [${level}] ${reqIdStr}${message}\n`;

    // コンソールには常に出力
    console.log(`[ServerLogger] ${level}: ${reqIdStr}${message}`);

    // ファイルへの書き込みが可能な場合のみ実行
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
      } catch (err) {
        console.error('[ServerLogger] ログファイル書き込みエラー:', err);
      }
    }
  }
}

// サーバーサイドでのみ動作するように条件分岐
const serverLogger = typeof window === 'undefined' ? ServerLogger.getInstance() : null;

export { serverLogger };
