'use client';

import { z } from 'zod';

export interface Character {
  id: string;
  name: string;
  llm: {
    type: string;
    model: string;
  };
  personality?: string;
  tone?: string;
}

const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  llm: z.object({
    type: z.string(),
    model: z.string(),
  }),
  personality: z.string().optional(),
  tone: z.string().optional(),
});

export async function loadCharacters(): Promise<Character[]> {
  try {
    const response = await fetch('/api/characters');
    if (!response.ok) {
      throw new Error('キャラクター設定の取得に失敗しました');
    }
    const data = await response.json();
    
    // Zodによるバリデーション
    const result = z.array(CharacterSchema).safeParse(data);
    
    if (!result.success) {
      console.error('キャラクター設定のバリデーションエラー:', result.error);
      return [];
    }
    
    return result.data;
  } catch (error) {
    console.error('キャラクター設定の読み込みエラー:', error);
    return [];
  }
}
