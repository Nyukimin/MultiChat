export class ClaudeClient {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async generate_response(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          llm: 'claude'
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
