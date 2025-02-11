import * as fs from 'fs';
import * as path from 'path';

interface ErrorLogInfo {
  errorFile: string;      // エラー発生ファイルの絶対パス
  errorMessage: string;   // エラーメッセージ
  relatedFiles: string[]; // 関連ファイルの絶対パス
  timestamp: string;      // エラー発生時刻
  stack?: string;        // スタックトレース（オプション）
}

export class ErrorLogger {
  private static logDir = path.join(process.cwd(), 'logs');

  static async logError(error: Error, errorFile: string, relatedFiles: string[] = []): Promise<void> {
    const errorInfo: ErrorLogInfo = {
      errorFile: path.resolve(errorFile),
      errorMessage: error.message,
      relatedFiles: relatedFiles.map(file => path.resolve(file)),
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    // ログディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // エラーログをファイルに書き込み
    const logFile = path.join(this.logDir, `error-${errorInfo.timestamp.replace(/[:.]/g, '-')}.log`);
    const logContent = this.formatErrorLog(errorInfo);
    
    await fs.promises.writeFile(logFile, logContent, 'utf8');
    
    // コンソールにも出力（開発環境の場合）
    if (process.env.NODE_ENV === 'development') {
      console.error(logContent);
    }
  }

  private static formatErrorLog(errorInfo: ErrorLogInfo): string {
    return `
エラー発生ファイル：${errorInfo.errorFile}
エラーメッセージ：${errorInfo.errorMessage}
関連ファイル：
${errorInfo.relatedFiles.map(file => `  - ${file}`).join('\n')}
発生時刻：${errorInfo.timestamp}
${errorInfo.stack ? `\nスタックトレース：\n${errorInfo.stack}` : ''}
`.trim();
  }
}
