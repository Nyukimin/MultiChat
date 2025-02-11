export class GeminiClient {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async generate_response(prompt: string): Promise<string> {
    // TODO: Implement Gemini API integration
    return `[${this.name}] Response to: ${prompt}`;
  }
}
