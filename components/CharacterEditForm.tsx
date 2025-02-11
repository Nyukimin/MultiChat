import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { CharacterSchema } from '@/app/lib/schemas/character';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/ui/error-message';

interface CharacterEditFormProps {
  initialData?: z.infer<typeof CharacterSchema>;
  onSubmit: (data: z.infer<typeof CharacterSchema>) => Promise<void>;
}

export function CharacterEditForm({ initialData, onSubmit }: CharacterEditFormProps) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialData || {
    id: '',
    name: '',
    llm: {
      type: 'gemini',
      model: 'gemini-pro'
    },
    characters: [{
      id: 1,
      name: '',
      personality: '',
      tone: ''
    }],
    preferences: {
      language: 'ja',
      response_style: 'detailed'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validatedData = CharacterSchema.parse(formData);
      await onSubmit(validatedData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const firstError = err.errors[0];
        setError(t('validation.required', {
          field: t(`field.${firstError.path[firstError.path.length - 1]}`)
        }));
      } else {
        setError(t('error.invalidCharacter'));
      }
    }
  };

  const handleChange = (path: string[], value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('field.name')}
          </label>
          <Input
            value={formData.name}
            onChange={e => handleChange(['name'], e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('field.personality')}
          </label>
          <Textarea
            value={formData.characters[0].personality}
            onChange={e => handleChange(['characters', 0, 'personality'], e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('field.tone')}
          </label>
          <Input
            value={formData.characters[0].tone}
            onChange={e => handleChange(['characters', 0, 'tone'], e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('field.responseStyle')}
          </label>
          <Input
            value={formData.preferences.response_style}
            onChange={e => handleChange(['preferences', 'response_style'], e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {error && <ErrorMessage error={error} className="mt-4" />}

      <Button type="submit" className="w-full">
        保存
      </Button>
    </form>
  );
}
