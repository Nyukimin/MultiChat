const { ProviderFactory } = require('./providers/provider-factory');

// テスト用の最小限の設定
const testConfigs = {
  anthropic: {
    name: "anthropic",
    type: "cloud",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "api_key",
    parameters: {
      apiKeyEnv: "NEXT_PUBLIC_ANTHROPIC_API_KEY",
      model: "claude-3-opus-20240229"
    },
    rateLimit: {
      requestsPerMinute: 15,
      maxConcurrent: 3
    }
  },
  ollama: {
    name: "ollama",
    type: "local",
    baseUrl: "http://localhost:11434",
    authType: "none",
    parameters: {
      baseUrlEnv: "NEXT_PUBLIC_OLLAMA_BASE_URL",
      model: "phi-4-deepseek"
    },
    rateLimit: {
      requestsPerMinute: 30,
      maxConcurrent: 2
    }
  }
};

async function basicTest() {
  console.log("基本動作テスト開始");
  
  // Anthropicプロバイダーのテスト
  try {
    console.log("\n=== Anthropic プロバイダーテスト ===");
    const anthropicProvider = await ProviderFactory.createProvider('anthropic', testConfigs.anthropic);
    
    console.log("1. ストリーミング応答テスト");
    for await (const chunk of anthropicProvider.generate("こんにちは、簡単な自己紹介をしてください。")) {
      process.stdout.write(chunk);
    }
    console.log("\n応答完了");
    
  } catch (error) {
    console.error("Anthropicテストエラー:", error);
  }

  // Ollamaプロバイダーのテスト
  try {
    console.log("\n=== Ollama プロバイダーテスト ===");
    const ollamaProvider = await ProviderFactory.createProvider('ollama', testConfigs.ollama);
    
    console.log("1. ストリーミング応答テスト");
    for await (const chunk of ollamaProvider.generate("こんにちは、簡単な自己紹介をしてください。")) {
      process.stdout.write(chunk);
    }
    console.log("\n応答完了");
    
  } catch (error) {
    console.error("Ollamaテストエラー:", error);
  }

  // レートリミッターのテスト
  try {
    console.log("\n=== レートリミッターテスト ===");
    const rateLimiter = ProviderFactory.getRateLimiter();
    const provider = await ProviderFactory.createProvider('anthropic', testConfigs.anthropic);

    console.log("1. 連続リクエストテスト");
    const promises = Array(5).fill(0).map((_, i) => 
      rateLimiter.schedule('anthropic', async () => {
        console.log(`リクエスト ${i + 1} 開始`);
        let response = '';
        for await (const chunk of provider.generate("数字を1つ教えてください。")) {
          response += chunk;
        }
        console.log(`リクエスト ${i + 1} 完了:`, response.trim());
      })
    );

    await Promise.all(promises);
    console.log("連続リクエストテスト完了");

  } catch (error) {
    console.error("レートリミッターテストエラー:", error);
  }
}

// テスト実行
console.log("テスト開始...");
basicTest().then(() => {
  console.log("\nすべてのテスト完了");
}).catch(error => {
  console.error("テスト実行エラー:", error);
});
