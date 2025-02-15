import { Anthropic } from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;
  private model: string = 'claude-3-opus-20240229';

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      const response = await this.client.messages.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        max_tokens: 1024,
        stream: true
      });

      const encoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          for await (const chunk of response) {
            if (chunk.type === 'message_delta' && chunk.delta.text) {
              const data = {
                text: chunk.delta.text,
                timestamp: Date.now()
              };
              const text = `data: ${JSON.stringify(data)}\n\n`;
              const encoded = encoder.encode(text);
              controller.enqueue(encoded);
            } else if (chunk.type === 'error') {
              controller.error(chunk);
            } else if (chunk.type === 'end') {
              controller.close();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error in Claude streaming chat:', error);
      throw error;
    }
  }
}