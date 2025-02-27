import { ResponseParser } from '../base/response-parser';
import { TokenStats } from '../../utils/token-stats';
import { serverLogger } from '../../utils/server-logger';

// Gemini 1.5 APIのレスポンス形式に対応
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<any>;
  }>;
  promptFeedback?: any;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface ParsedChunk {
  text: string;
  raw: string;
  isComplete: boolean;
}

export class GeminiParser implements ResponseParser {
  private buffer: string = '';
  private startTime: number = Date.now();
  private tokenCount: number = 0;
  private isAborted: boolean = false;

  constructor() {
    this.reset();
  }

  // パーサーの状態をリセット
  public reset(): void {
    this.buffer = '';
    this.startTime = Date.now();
    this.tokenCount = 0;
    this.isAborted = false;
  }

  // 中断フラグを設定
  public abort(): void {
    this.isAborted = true;
  }

  // 中断状態を確認
  public isAbortRequested(): boolean {
    return this.isAborted;
  }

  // チャンクをパースして結果を返す
  public parse(chunk: string): string {
    // 中断リクエストがあれば空の文字列を返す
    if (this.isAborted) {
      serverLogger?.debug('Parser is in aborted state, ignoring chunk');
      return '';
    }

    try {
      const parsedChunk = JSON.parse(chunk);
      const text = this.extractTextFromObject(parsedChunk);
      
      if (text) {
        this.tokenCount += this.estimateTokenCount(text);
        const tokenPerSec = this.calculateTokensPerSecond();
        
        console.log(`Gemini：受信：${text}(${tokenPerSec.toFixed(1)} token/sec)`);
      }

      return text;
    } catch (error) {
      if (error instanceof Error) {
        serverLogger?.error(`Geminiパースエラー: ${error.message}`);
        console.error(`Geminiパースエラー: ${error.message}`);
      }
      return '';
    }
  }

  // オブジェクトからテキストを抽出
  private extractTextFromObject(obj: any): string {
    try {
      if (!obj) return '';
      
      // candidatesプロパティを持つオブジェクトの処理
      if (obj.candidates && Array.isArray(obj.candidates) && obj.candidates.length > 0) {
        const candidate = obj.candidates[0];
        if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts)) {
          const part = candidate.content.parts[0];
          if (part && part.text) {
            return this.sanitizeJsonString(part.text);
          }
        }
      }
      
      // textプロパティを直接持つオブジェクトの処理
      if (obj.text) {
        return this.sanitizeJsonString(obj.text);
      }
      
      return '';
    } catch (error) {
      serverLogger?.error(`Text extraction error: ${error.message}`);
      return '';
    }
  }

  // JSONの文字列をサニタイズ
  private sanitizeJsonString(str: string): string {
    if (typeof str !== 'string') return '';
    
    // 制御文字を削除
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }

  // トークン数を推定（簡易的な実装）
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // トークン/秒を計算
  private calculateTokensPerSecond(): number {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    if (elapsedSeconds <= 0) return 0;
    return this.tokenCount / elapsedSeconds;
  }
}
