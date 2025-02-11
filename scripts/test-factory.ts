import { LLMClientFactory } from '../app/lib/ai_clients/factory';
import { LLMType } from '../app/lib/types/ai';

async function testFactory() {
  console.log('=== LLMClientFactory 動作確認 ===');

  try {
    // 1. 正常系：Anthropicクライアントの生成
    console.log('\n1. Anthropicクライアントの生成テスト');
    const client1 = await LLMClientFactory.getInstance('anthropic');
    const client2 = await LLMClientFactory.getInstance('anthropic');
    console.log('- 同一インスタンスの確認:', client1 === client2 ? '成功' : '失敗');

    // 2. 異常系：APIキーが未設定の場合
    console.log('\n2. APIキー未設定テスト');
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = '';
    try {
      await LLMClientFactory.getInstance('anthropic');
      console.log('- エラー発生せず（異常）');
    } catch (error) {
      console.log('- 適切なエラー発生を確認:', (error as Error).message);
    }
    process.env.ANTHROPIC_API_KEY = originalKey;

    // 3. 異常系：未対応のLLMタイプを指定
    console.log('\n3. 未対応LLMタイプテスト');
    try {
      await LLMClientFactory.getInstance('unknown' as LLMType);
      console.log('- エラー発生せず（異常）');
    } catch (error) {
      console.log('- 適切なエラー発生を確認:', (error as Error).message);
    }

  } catch (error) {
    console.error('予期せぬエラーが発生:', error);
  }
}

testFactory();
