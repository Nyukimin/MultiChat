import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Character } from '../schemas/character';
import type { HistoryEntry } from '../schemas/history';

export class HistoryManager {
  private static readonly HISTORY_DIR = path.join(process.cwd(), 'config', 'history');

  // 変更履歴の保存
  static async saveHistory(
    characterId: string,
    oldData: Character,
    newData: Character
  ): Promise<void> {
    try {
      // 変更点を検出
      const changes = this.detectChanges(oldData, newData);
      if (changes.length === 0) return;

      const historyEntry: HistoryEntry = {
        id: uuidv4(),
        characterId,
        timestamp: new Date().toISOString(),
        changes,
        snapshot: newData,
      };

      // ディレクトリが存在しない場合は作成
      await fs.mkdir(this.HISTORY_DIR, { recursive: true });

      // 履歴ファイルのパス
      const filePath = path.join(
        this.HISTORY_DIR,
        `${characterId}_${historyEntry.id}.json`
      );

      // 履歴を保存
      await fs.writeFile(
        filePath,
        JSON.stringify(historyEntry, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('履歴の保存に失敗しました:', error);
      throw error;
    }
  }

  // キャラクターの変更履歴を取得
  static async getHistory(characterId: string): Promise<HistoryEntry[]> {
    try {
      const files = await fs.readdir(this.HISTORY_DIR);
      const historyFiles = files.filter(file => file.startsWith(characterId));

      const historyEntries = await Promise.all(
        historyFiles.map(async (file) => {
          const content = await fs.readFile(
            path.join(this.HISTORY_DIR, file),
            'utf-8'
          );
          return JSON.parse(content) as HistoryEntry;
        })
      );

      // タイムスタンプで降順ソート
      return historyEntries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('履歴の取得に失敗しました:', error);
      return [];
    }
  }

  // 変更点を検出する関数
  private static detectChanges(oldData: Character, newData: Character) {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // フラットな比較のためのヘルパー関数
    const compareValues = (path: string, oldVal: any, newVal: any) => {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: path,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    };

    // 基本フィールドの比較
    compareValues('name', oldData.name, newData.name);
    compareValues('llm', oldData.llm, newData.llm);
    
    // キャラクター設定の比較
    oldData.characters.forEach((oldChar, index) => {
      const newChar = newData.characters[index];
      if (newChar) {
        compareValues(
          `characters[${index}].personality`,
          oldChar.personality,
          newChar.personality
        );
        compareValues(
          `characters[${index}].tone`,
          oldChar.tone,
          newChar.tone
        );
      }
    });

    // 設定の比較
    compareValues('preferences', oldData.preferences, newData.preferences);

    return changes;
  }
}
