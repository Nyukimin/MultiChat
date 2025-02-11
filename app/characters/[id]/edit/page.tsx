'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { CharacterEditForm } from '@/components/CharacterEditForm';
import { ErrorMessage } from '@/components/ui/error-message';
import type { Character } from '@/app/lib/schemas/character';

export default function EditCharacterPage({
  params
}: {
  params: { id: string }
}) {
  const router = useRouter();
  const t = useTranslations();
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await fetch(`/api/characters/${params.id}`);
        if (!response.ok) {
          throw new Error(t('error.characterNotFound'));
        }
        const data = await response.json();
        setCharacter(data);
      } catch (err) {
        setError(t('error.loadCharacter'));
      }
    };

    fetchCharacter();
  }, [params.id, t]);

  const handleSubmit = async (data: Character) => {
    try {
      const response = await fetch(`/api/characters/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(t('error.invalidCharacter'));
      }

      router.push('/');
    } catch (err) {
      setError(t('error.networkError'));
    }
  };

  if (error) {
    return <ErrorMessage error={error} className="m-4" />;
  }

  if (!character) {
    return <div className="m-4">読み込み中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">キャラクター設定の編集</h1>
      <CharacterEditForm
        initialData={character}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
