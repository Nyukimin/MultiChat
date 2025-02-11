import { type Character } from '@/app/lib/schemas/character';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CharacterPreviewProps {
  character: Character;
  className?: string;
}

export function CharacterPreview({ character, className = '' }: CharacterPreviewProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{character.name}</h3>
          <Badge variant="outline">{character.llm.type}</Badge>
        </div>

        <div className="space-y-2">
          {character.characters.map((trait) => (
            <div key={trait.id} className="space-y-1">
              <h4 className="text-sm font-medium">{trait.name}</h4>
              <p className="text-sm text-gray-600">{trait.personality}</p>
              <p className="text-sm text-gray-500 italic">{trait.tone}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex gap-2 text-sm text-gray-500">
            <span>言語: {character.preferences.language}</span>
            <span>•</span>
            <span>応答スタイル: {character.preferences.response_style}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
