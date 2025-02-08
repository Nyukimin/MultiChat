import { NextRequest, NextResponse } from 'next/server'
import { ClaudeClient } from '@/app/lib/ai_clients/claude_client'
import { GeminiClient } from '@/app/lib/ai_clients/gemini_client'
import { OllamaClient } from '@/app/lib/ai_clients/ollama_client'

export async function POST(request: NextRequest) {
  try {
    const { prompt, llm } = await request.json()

    let client

    switch (llm) {
      case 'claude':
        client = new ClaudeClient('Claude')
        break
      case 'gemini':
        client = new GeminiClient('Gemini')
        break
      case 'ollama':
        client = new OllamaClient('Ollama')
        break
      default:
        throw new Error('サポートされていないLLMが選択されました')
    }

    const response = await client.generate_response(prompt)

    return NextResponse.json({ message: response })
  } catch (error) {
    console.error('チャット処理中にエラーが発生しました:', error)
    return NextResponse.json({ error: 'チャット処理中にエラーが発生しました' }, { status: 500 })
  }
}
