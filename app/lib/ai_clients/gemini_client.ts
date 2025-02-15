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

      return new ReadableStream({
        async start(controller) {
          for await (const chunk of response.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(text);
            }
          }
          controller.close();
        }
      });
    } catch (error) {
      console.error('Error in Gemini streaming chat:', error);
      throw error;
    }
  }
}
