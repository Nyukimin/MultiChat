import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel, LogEntry, UserInfo } from './logger-interface';

export class ProviderLogger implements Logger {
  private logDirectory: string;

  constructor(logDirectory: string = './logs/providers') {
    this.logDirectory = logDirectory;
    
    // ログディレクトリが存在しない場合は作成
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }
  }

  // プロバイダ別のログファイルパスを生成
  private getLogFilePath(provider: string): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logDirectory, `${provider}_${today}.log`);
  }

  // ログエントリをファイルに書き込む
  private writeLogEntry(provider: string, entry: LogEntry): void {
    const logFilePath = this.getLogFilePath(provider);
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(logFilePath, logLine);
    } catch (error) {
      console.error('ログ書き込みエラー:', error);
    }
  }

  // 汎用ログメソッド
  log(
    provider: string, 
    level: LogLevel, 
    message: string, 
    options: {
      user?: UserInfo;
      context?: Record<string, any>;
    } = {}
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      provider,
      level,
      message,
      user: options.user,
      context: options.context
    };

    this.writeLogEntry(provider, entry);

    // コンソールにも出力
    this.consoleLog(level, this.formatConsoleLog(entry));
  }

  // コンソール出力用のフォーマット
  private formatConsoleLog(entry: LogEntry): string {
    const userInfo = entry.user 
      ? `[${entry.user.role || 'unknown'}:${entry.user.name || entry.user.id || 'anonymous'}]` 
      : '';
    
    return `[${entry.timestamp}] [${entry.provider}] ${userInfo} ${entry.message}`;
  }

  // コンソールログ
  private consoleLog(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  // 各レベルのショートカットメソッド
  debug(
    provider: string, 
    message: string, 
    options: { user?: UserInfo; context?: Record<string, any> } = {}
  ): void {
    this.log(provider, LogLevel.DEBUG, message, options);
  }

  info(
    provider: string, 
    message: string, 
    options: { user?: UserInfo; context?: Record<string, any> } = {}
  ): void {
    this.log(provider, LogLevel.INFO, message, options);
  }

  warn(
    provider: string, 
    message: string, 
    options: { user?: UserInfo; context?: Record<string, any> } = {}
  ): void {
    this.log(provider, LogLevel.WARN, message, options);
  }

  error(
    provider: string, 
    message: string, 
    options: { user?: UserInfo; context?: Record<string, any> } = {}
  ): void {
    this.log(provider, LogLevel.ERROR, message, options);
  }

  // ログのローテーション（オプション）
  rotateOldLogs(maxAgeDays: number = 7): void {
    const now = new Date();
    
    fs.readdirSync(this.logDirectory).forEach(file => {
      const filePath = path.join(this.logDirectory, file);
      const stats = fs.statSync(filePath);
      const daysDiff = (now.getTime() - stats.mtime.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff > maxAgeDays) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

// シングルトンインスタンスを作成
export const providerLogger = new ProviderLogger();
