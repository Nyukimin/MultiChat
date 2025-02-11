import { useState, useEffect } from 'react';
import type { HistoryEntry } from '@/app/lib/schemas/history';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CharacterPreview } from './CharacterPreview';

interface CharacterHistoryProps {
  characterId: string;
  onRestoreVersion?: (version: HistoryEntry) => void;
}

export function CharacterHistory({
  characterId,
  onRestoreVersion
}: CharacterHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/characters/${characterId}/history`);
        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError('履歴の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [characterId]);

  if (loading) return <div>履歴を読み込み中...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (history.length === 0) return <div>変更履歴がありません</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">変更履歴</h3>
      <ScrollArea className="h-[400px] rounded-md border p-4">
        {history.map((entry) => (
          <div
            key={entry.id}
            className={`p-4 border rounded-lg mb-4 cursor-pointer transition-colors ${
              selectedVersion === entry.id
                ? 'border-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedVersion(entry.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {new Date(entry.timestamp).toLocaleString('ja-JP')}
              </span>
              {onRestoreVersion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreVersion(entry)}
                >
                  このバージョンに戻す
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {entry.changes.map((change, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{change.field}:</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-red-500 line-through">
                      {JSON.stringify(change.oldValue)}
                    </div>
                    <div className="text-green-500">
                      {JSON.stringify(change.newValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedVersion === entry.id && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">プレビュー</h4>
                <CharacterPreview character={entry.snapshot} />
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
