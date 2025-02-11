'use server';

import { MessageContent } from '../types/ai';
import { getLLMClient } from '../ai_clients/factory';
import { loadCharacterPrompt } from '../utils/characterPromptLoader';

export async function generateCharacterResponse(
  message: MessageContent,
  characterId: string
): Promise<string> {
  try {
    const client = await getLLMClient('anthropic');
    const systemPrompt = await loadCharacterPrompt(characterId);
    
    const response = await client.generate(message, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1000
    });

    return response.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
}
