declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ANTHROPIC_API_KEY?: string;
      GOOGLE_API_KEY?: string;
      GEMINI_API_KEY?: string;
      NEXT_PUBLIC_OLLAMA_HOST: string;
      NEXT_PUBLIC_OLLAMA_MODEL: string;
      NEXT_PUBLIC_CHAT_SPEED: string;
      NEXT_PUBLIC_DEBUG_MODE: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}
