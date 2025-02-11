import { z } from 'zod';

// LLMの設定スキーマ
const LLMSchema = z.object({
  type: z.enum(['gemini', 'claude', 'ollama']),
  model: z.string().min(1, 'モデル名は必須です'),
});

// キャラクターの性格設定スキーマ
const CharacterTraitSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'キャラクター名は必須です'),
  personality: z.string().min(1, '性格設定は必須です'),
  tone: z.string().min(1, '話し方の設定は必須です'),
});

// キャラクター設定全体のスキーマ
export const CharacterSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  name: z.string().min(1, '名前は必須です'),
  llm: LLMSchema,
  characters: z.array(CharacterTraitSchema).min(1, '少なくとも1つのキャラクター設定が必要です'),
  preferences: z.object({
    language: z.enum(['ja', 'en']),
    response_style: z.string().min(1, 'レスポンススタイルは必須です'),
  }),
});

// 型の導出
export type Character = z.infer<typeof CharacterSchema>;
