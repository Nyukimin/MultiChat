import { z } from 'zod';
import { CharacterSchema } from './character';

export const HistoryEntrySchema = z.object({
  id: z.string(),
  characterId: z.string(),
  timestamp: z.string(),
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
  snapshot: CharacterSchema,
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
