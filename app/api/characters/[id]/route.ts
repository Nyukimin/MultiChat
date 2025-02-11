import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { CharacterSchema } from '@/app/lib/schemas/character';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const filePath = path.join(process.cwd(), 'config', 'users', `${params.id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    const validatedData = CharacterSchema.safeParse(data);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'キャラクター設定が不正です' },
        { status: 400 }
      );
    }

    return NextResponse.json(validatedData.data);
  } catch (error) {
    return NextResponse.json(
      { error: 'キャラクター設定が見つかりません' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const validatedData = CharacterSchema.safeParse(data);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '不正なキャラクター設定です', details: validatedData.error },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'config', 'users', `${params.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(validatedData.data, null, 2));

    return NextResponse.json(validatedData.data);
  } catch (error) {
    return NextResponse.json(
      { error: 'キャラクター設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}
