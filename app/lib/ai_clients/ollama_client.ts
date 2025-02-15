export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama2';
  }

  async streamChat(prompt: string): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.response) {
                    controller.enqueue(parsed.response);
                  }
                } catch (e) {
                  console.error('Error parsing JSON:', e);
                }
              }
            }
            controller.close();
          } catch (error) {
            console.error('Error in stream processing:', error);
            controller.error(error);
          }
        },
        cancel() {
          reader.cancel();
        }
      });
    } catch (error) {
      console.error('Error in Ollama streaming chat:', error);
      throw error;
    }
  }
}
