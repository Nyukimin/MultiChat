import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: string = 'gemini-pro';

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      const response = await model.generateContentStream(prompt);
      const startTime = Date.now();
      let totalTokens = 0;

      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response.stream) {
              const chunkData = chunk.text();
              console.log('📦 受信チャンク:', chunkData);
              
              // JSONとして解析を試みる
              try {
                const jsonData = JSON.parse(chunkData);
                console.log('✅ JSONパース成功');
                
                // テキストの抽出
                if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
                  const text = jsonData.candidates[0].content.parts[0].text;
                  console.log('Gemini：受信：', text);
                  controller.enqueue(text);
                }

                // トークン情報の抽出と計算
                if (jsonData.usageMetadata?.candidatesTokenCount) {
                  const tokens = jsonData.usageMetadata.candidatesTokenCount;
                  totalTokens = tokens;
                  const elapsedSeconds = (Date.now() - startTime) / 1000;
                  const tokensPerSecond = totalTokens / elapsedSeconds;
                  
                  console.log(`📊 トークン統計:
                    総トークン数: ${totalTokens}
                    経過時間: ${elapsedSeconds.toFixed(2)}秒
                    トークン/秒: ${tokensPerSecond.toFixed(2)}`);
                }
              } catch (parseError) {
                // JSONとして解析できない場合の処理
                const errorLocation = new Error().stack?.split('\n')[1]?.trim() || 'unknown location';
                console.log(`⚠️ JSONパース失敗 at ${errorLocation}:`, parseError.message);
                console.log('🔍 チャンクタイプ:', typeof chunkData);
                console.log('📏 チャンク長:', chunkData.length);

                if (chunkData.trim()) {
                  console.log('🔄 生テキストとして処理:', chunkData);
                  controller.enqueue(chunkData);
                } else {
                  console.log('⏩ 空のチャンクをスキップ');
                }
              }
            }
            console.log('✨ ストリーム終了');
            controller.close();
          } catch (streamError) {
            console.error('❌ ストリーム処理エラー:', streamError);
            controller.error(streamError);
          }
        }
      });
    } catch (error) {
      console.error('❌ Geminiストリーミングチャットエラー:', error);
      throw error;
    }
  }
}
