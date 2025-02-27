import { format } from 'date-fns';
import { generateRequestId } from './request-id-generator';

class Logger {
  private static instance: Logger;
  private isEnabled: boolean = true;
  private isClient: boolean = false;
  private logQueue: Array<{level: string, message: string, requestId?: string}> = [];
  private isProcessingQueue: boolean = false;
  private logEndpoint: string = '/api/log';
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private currentRequestId: string = '';
  private sessionId: string = '';

  private constructor() {
    // クライアントサイドかサーバーサイドかを判定
    this.isClient = typeof window !== 'undefined';
    
    if (this.isClient) {
      // セッションIDを生成
      this.sessionId = `SESSION-${Math.random().toString(36).substring(2, 10)}`;
      
      // クライアントサイドの場合は初期化ログをコンソールに出力
      console.log(`[Client Logger] Initialized with session ID: ${this.sessionId}`);
      
      // ログキューを初期化
      this.clearLogQueue();
      
      // 定期的にログキューを処理
      this.queueProcessingInterval = setInterval(() => this.processLogQueue(), 2000);
      
      // ページアンロード時にキューを処理
      window.addEventListener('beforeunload', () => {
        this.flushLogQueue();
        if (this.queueProcessingInterval) {
          clearInterval(this.queueProcessingInterval);
        }
      });
    } else {
      // サーバーサイドの場合は警告を出力
      console.warn('サーバーサイドでクライアントロガーが使用されています。server-logger.tsを使用してください。');
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public enable(): void {
    this.isEnabled = true;
    this.info('Logging enabled');
  }

  public disable(): void {
    this.info('Logging disabled');
    this.isEnabled = false;
  }

  public clearLogQueue(): void {
    this.logQueue = [];
    console.log(`[Client Logger] Log queue cleared for session ${this.sessionId}`);
  }

  public flushLogQueue(): void {
    if (this.logQueue.length > 0) {
      console.log(`[Client Logger] Flushing ${this.logQueue.length} log entries before unload`);
      this.processLogQueue();
    }
  }

  public setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
    this.info(`リクエストID設定: ${requestId}`);
  }

  public getRequestId(): string {
    return this.currentRequestId;
  }

  public info(message: string, requestId?: string): void {
    this.log('INFO', message, requestId || this.currentRequestId);
  }

  public debug(message: string, requestId?: string): void {
    this.log('DEBUG', message, requestId || this.currentRequestId);
  }

  public error(message: string, error?: Error, requestId?: string): void {
    this.log('ERROR', message, requestId || this.currentRequestId);
    if (error) {
      this.log('ERROR', `Error details: ${error.message}`, requestId || this.currentRequestId);
      if (error.stack) {
        this.log('ERROR', `Stack trace: ${error.stack}`, requestId || this.currentRequestId);
      }
    }
  }

  public warn(message: string, requestId?: string): void {
    this.log('WARN', message, requestId || this.currentRequestId);
  }

  public apiRequest(provider: string, prompt: string, requestId?: string): void {
    this.log('API_REQUEST', `${provider}：送信：${prompt}`, requestId || this.currentRequestId);
  }

  public apiResponse(provider: string, rawResponse: string, requestId?: string): void {
    this.log('API_RESPONSE', `${provider}：受信：${rawResponse}`, requestId || this.currentRequestId);
  }

  public apiParsedResponse(provider: string, text: string, tokenSpeed?: number, requestId?: string): void {
    const tokenSpeedStr = tokenSpeed ? `(${tokenSpeed} token/sec)` : '';
    this.log('API_PARSED', `${provider}：受信：${text}${tokenSpeedStr}`, requestId || this.currentRequestId);
  }

  public apiError(provider: string, error: any, requestId?: string): void {
    this.log('API_ERROR', `${provider}：エラー：${error}`, requestId || this.currentRequestId);
  }

  private log(level: string, message: string, requestId?: string): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const logEntry = `[${timestamp}] [${level}] ${reqIdStr}${message}`;

    // コンソールには常に出力
    console.log(logEntry);
    
    if (this.isClient) {
      // クライアントサイドの場合はログキューに追加
      this.logQueue.push({
        level,
        message,
        requestId
      });
    }
  }

  private async processLogQueue(): Promise<void> {
    if (this.isProcessingQueue || this.logQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      // キューからログを取得（最大10件）
      const logsToProcess = this.logQueue.splice(0, 10);
      
      // 各ログをサーバーに送信
      for (const log of logsToProcess) {
        await this.sendLogToServer(log);
      }
    } catch (error) {
      console.error('ログの送信中にエラーが発生しました:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // まだログが残っている場合は続けて処理
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processLogQueue(), 100);
      }
    }
  }

  private async sendLogToServer(log: {level: string, message: string, requestId?: string}): Promise<void> {
    try {
      // セッションIDを含める
      const logWithSession = {
        ...log,
        sessionId: this.sessionId
      };
      
      const response = await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logWithSession),
      });
      
      if (!response.ok) {
        console.error('ログの送信に失敗しました:', await response.text());
      }
    } catch (error) {
      console.error('ログAPIへの接続に失敗しました:', error);
    }
  }
}

export const logger = Logger.getInstance();
