'use client';

export default function DebugPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">環境変数デバッグ</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(
          {
            NEXT_PUBLIC_ANTHROPIC_API_KEY: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY?.slice(0, 10) + '...',
            NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY?.slice(0, 10) + '...',
            NEXT_PUBLIC_OLLAMA_BASE_URL: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
