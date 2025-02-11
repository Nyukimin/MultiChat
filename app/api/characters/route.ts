import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { CharacterSchema } from '@/app/lib/schemas/character';

export async function GET() {
  try {
    const configDir = path.join(process.cwd(), 'config', 'users');
    const files = await fs.readdir(configDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const characters = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(configDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const rawData = JSON.parse(content);
          
          // Zodによるバリデーション
          const validatedData = CharacterSchema.safeParse(rawData);
          
          if (!validatedData.success) {
            console.error(`Validation error in ${file}:`, validatedData.error);
            return null;
          }
          
          return validatedData.data;
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
          return null;
        }
      })
    );

    // nullを除外して有効なキャラクターのみを返す
    const validCharacters = characters.filter(char => char !== null);

    if (validCharacters.length === 0) {
      return NextResponse.json(
        { error: 'キャラクター設定が見つかりませんでした' },
        { status: 404 }
      );
    }

    return NextResponse.json(validCharacters);
  } catch (error) {
    console.error('キャラクター設定の読み込みエラー:', error);
    return NextResponse.json(
      { error: 'キャラクター設定の読み込みに失敗しました' },
      { status: 500 }
    );
  }
}
