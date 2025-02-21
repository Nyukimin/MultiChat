import { ResponseParser } from '../base/response-parser';
import { TokenStats } from '../../utils/token-stats';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    candidatesTokenCount?: number;
  };
}

export class GeminiParser implements ResponseParser {
  private tokenStats: TokenStats;
  private buffer: string;

  constructor() {
    this.tokenStats = new TokenStats();
    this.buffer = '';
  }

  parse(chunk: string): string {
    try {
      // 生データをログ出力
      console.log('Gemini：受信（生データ）：', chunk);

      // バッファにチャンクを追加
      this.buffer += chunk;

      // 完全なJSONを探す
      const jsonMatch = this.buffer.match(/\[{.*?}\]/);
      if (!jsonMatch) {
        return '';  // 完全なJSONが見つからない
      }

      // 見つかったJSONを処理
      const jsonStr = jsonMatch[0];
      this.buffer = this.buffer.slice(jsonMatch.index! + jsonStr.length);

      const data = this.parseJson(jsonStr);
      const text = this.extractText(data);
      this.updateTokenStats(data);

      if (text) {
        const tokenSpeed = this.tokenStats.getTokensPerSecond();
        console.log(`Gemini：受信（テキスト）：${text}(${tokenSpeed.toFixed(1)} token/sec)`);
      }

      return text || '';
    } catch (error) {
      return this.handleError(error, chunk);
    }
  }

  private parseJson(chunk: string): GeminiResponse {
    try {
      // [{ ... }] 形式から { ... } 部分を抽出
      const jsonStr = chunk.trim().slice(1, -1);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Gemini：エラー：JSONパース失敗 [gemini-parser.ts:82]');
      console.error('Gemini：エラー詳細：', error.message);
      console.error('Gemini：エラー時の生データ：', chunk);
      throw new Error(`JSONパースエラー [gemini-parser.ts:85]: ${error.message}`);
    }
  }

  private extractText(data: GeminiResponse): string | undefined {
    try {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.warn('Gemini：警告：応答データにテキストが含まれていません [gemini-parser.ts:93]');
      }
      return text;
    } catch (error) {
      console.error('Gemini：エラー：テキスト抽出失敗 [gemini-parser.ts:97]');
      console.error('Gemini：エラー詳細：', error.message);
      console.error('Gemini：エラー時のデータ：', JSON.stringify(data, null, 2));
      throw new Error(`テキスト抽出エラー [gemini-parser.ts:100]: ${error.message}`);
    }
  }

  private updateTokenStats(data: GeminiResponse): void {
    try {
      const tokens = data.usageMetadata?.candidatesTokenCount;
      if (tokens === undefined) {
        console.warn('Gemini：警告：トークン数が取得できません [gemini-parser.ts:108]');
        return;
      }
      this.tokenStats.updateTokenCount(tokens);
    } catch (error) {
      console.error('Gemini：エラー：トークン統計更新失敗 [gemini-parser.ts:113]');
      console.error('Gemini：エラー詳細：', error.message);
      console.error('Gemini：エラー時のデータ：', JSON.stringify(data, null, 2));
      // トークン統計の更新は重要ではないので、エラーはスローしない
    }
  }

  handleError(error: Error, chunk: string): string {
    console.error('Gemini：エラー：パース処理失敗 [gemini-parser.ts:122]');
    console.error('Gemini：エラー詳細：', error.message);
    console.error('Gemini：エラー時の生データ：', chunk);
    return '';
  }
}
