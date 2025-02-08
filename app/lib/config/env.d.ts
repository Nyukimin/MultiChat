declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ANTHROPIC_API_KEY: string;
      GOOGLE_API_KEY: string;
      GEMINI_API_KEY?: string;
      OLLAMA_HOST: string;
      OLLAMA_MODEL: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}
