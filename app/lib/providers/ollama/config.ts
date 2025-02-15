/**
 * Ollamaプロバイダーの設定インターフェース
 */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  maxTokens: number;
  options: {
    temperature: number;
    top_k: number;
    top_p: number;
    repeat_penalty: number;
  };
}

/**
 * デフォルト設定値
 */
export const defaultConfig: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S',
  maxTokens: 2048,
  options: {
    temperature: 0.7,
    top_k: 40,
    top_p: 0.9,
    repeat_penalty: 1.1
  }
};

/**
 * 環境変数から設定を取得
 * 環境変数が設定されていない場合はデフォルト値を使用
 */
export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || defaultConfig.baseUrl,
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || defaultConfig.model,
    maxTokens: defaultConfig.maxTokens,
    options: {
      temperature: Number(process.env.NEXT_PUBLIC_OLLAMA_TEMPERATURE) || defaultConfig.options.temperature,
      top_k: Number(process.env.NEXT_PUBLIC_OLLAMA_TOP_K) || defaultConfig.options.top_k,
      top_p: Number(process.env.NEXT_PUBLIC_OLLAMA_TOP_P) || defaultConfig.options.top_p,
      repeat_penalty: Number(process.env.NEXT_PUBLIC_OLLAMA_REPEAT_PENALTY) || defaultConfig.options.repeat_penalty
    }
  };
}
