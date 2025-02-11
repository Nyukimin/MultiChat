export class OllamaClient {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async generate_response(prompt: string): Promise<string> {
    // TODO: Implement Ollama API integration
    return `[${this.name}] Response to: ${prompt}`;
  }
}
