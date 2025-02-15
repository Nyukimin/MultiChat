import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderConfig } from '@/app/lib/providers/base/ai-provider';
import { ConfigLoader } from '@/app/lib/providers/utils/config-loader';
import { RateLimiter } from '@/app/lib/providers/utils/rate-limiter';

async function testProviders() {
  try {
    // 設定の読み込み
    const configs = await ConfigLoader.loadProviderConfigs();
    const factory = ProviderFactory;
    
    // テスト用のプロンプト
    const testPrompts = [
      "こんにちは、元気ですか？",
      "今日の天気はどうですか？",
      "好きな食べ物は何ですか？"
    ];

    // 各プロバイダーでテスト
    for (const [name, config] of configs.entries()) {
      console.log(`\n=== ${name} プロバイダーのテスト ===`);
      
      try {
        const provider = await factory.createProvider(name as any, config);
        const rateLimiter = factory.getRateLimiter();

        // 同時リクエストのテスト
        console.log('並列リクエストのテスト開始...');
        const startTime = Date.now();

        const results = await Promise.all(
          testPrompts.map(async (prompt, index) => {
            try {
              const response = await rateLimiter.schedule(name, async () => {
                console.log(`${name}: リクエスト ${index + 1} 開始`);
                const result = [];
                for await (const chunk of provider.generate(prompt)) {
                  result.push(chunk);
                }
                return result.join('');
              });
              
              console.log(`${name}: リクエスト ${index + 1} 完了`);
              return response;
            } catch (error) {
              console.error(`${name}: リクエスト ${index + 1} エラー:`, error);
              return null;
            }
          })
        );

        const endTime = Date.now();
        console.log(`${name}: 全リクエスト完了`);
        console.log(`実行時間: ${(endTime - startTime) / 1000}秒`);

        // レートリミッターの状態を表示
        const status = rateLimiter.getProviderStatus(name);
        console.log('レートリミッター状態:', {
          利用可能トークン: status.availableTokens,
          現在の同時実行数: status.currentConcurrent,
          最大同時実行数: status.maxConcurrent,
          毎分リクエスト制限: status.requestsPerMinute
        });

      } catch (error) {
        console.error(`${name} プロバイダーのテスト中にエラー:`, error);
      }
    }

  } catch (error) {
    console.error('テスト実行中にエラー:', error);
  }
}

// テストの実行
console.log('プロバイダーテストを開始します...');
testProviders().then(() => {
  console.log('\nテスト完了');
}).catch(error => {
  console.error('テスト失敗:', error);
});
