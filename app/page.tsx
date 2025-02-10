"use client"

import React, { useState, useEffect } from 'react';
import { ChatProvider } from '@/app/lib/context/ChatContext';

interface CharacterResponse {
  characterId: string;
  message: string;
  llmName?: string;
  responseTime?: number;
  tokensPerSecond?: number;
  questionTimestamp?: Date;
  responseTimestamp?: Date;
}

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(['character1', 'character2', 'character3'])
  const [ownerInput, setOwnerInput] = useState('');
  const [characterResponses, setCharacterResponses] = useState<CharacterResponse[]>([]);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [question, setQuestion] = useState('');

  // キャラクターリストの定義
  const characters = [
    {
      id: 'character1',
      name: 'アリス',
      avatar: '/avatars/alice.png',
      description: '明るく活発な少女'
    },
    {
      id: 'character2',
      name: 'ボブ',
      avatar: '/avatars/bob.png',
      description: '冷静で論理的な青年'
    },
    {
      id: 'character3',
      name: 'キャロル',
      avatar: '/avatars/carol.png',
      description: '優しく思いやりのある女性'
    }
  ];

  const handleSendInstruction = async () => {
    if (!ownerInput.trim()) return;

    const questionTimestamp = new Date();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction: ownerInput,
          characters: selectedCharacters
        })
      });

      if (!response.ok) {
        throw new Error('指示の送信に失敗しました');
      }

      const data = await response.json();
      const responseTimestamp = new Date();

      const enrichedResponses = data.responses.map((resp: any) => ({
        ...resp,
        llmName: 'Claude-3-Opus',
        questionTimestamp,
        responseTimestamp,
        responseTime: (responseTimestamp.getTime() - questionTimestamp.getTime()) / 1000,
        tokensPerSecond: resp.tokenCount ? resp.tokenCount / ((responseTimestamp.getTime() - questionTimestamp.getTime()) / 1000) : 0
      }));

      setCharacterResponses(enrichedResponses);
      setOwnerInput('');
    } catch (error) {
      console.error('エラー:', error);
    }
  };

  // キャラクター名を取得するヘルパー関数
  const getCharacterName = (id: string) => {
    const character = characters.find(c => c.id === id);
    return character ? character.name : id;
  };

  // 時刻をHH:MM:SS形式でフォーマット
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <ChatProvider>
      <main className="min-h-screen p-8 bg-gradient-to-br from-pink-100 to-blue-100">
        <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <div className="flex gap-8">
            {/* 左側エリア */}
            <div className="w-1/4">
              {/* オーナー入力エリア */}
              <div className="mb-6">
                <textarea
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  className="w-full h-48 p-4 border rounded-lg resize-none"
                  placeholder="オーナー入力"
                />
              </div>

              {/* キャラクター選択エリア */}
              <div>
                {characters.map((character) => (
                  <div key={character.id} className="mb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        id={character.id}
                        checked={selectedCharacters.includes(character.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCharacters([...selectedCharacters, character.id]);
                          } else {
                            setSelectedCharacters(selectedCharacters.filter(id => id !== character.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor={character.id}>{character.name}</label>
                    </div>
                    <div className="text-sm text-gray-600 ml-6">Claude-3</div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSendInstruction}
                disabled={!ownerInput.trim() || selectedCharacters.length === 0}
                className="w-full mt-4 py-2 px-4 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
              >
                送信
              </button>
            </div>

            {/* 右側エリア - 質問と回答表示 */}
            <div className="w-3/4">
              {/* 質問表示エリア */}
              <div className="mb-6 p-4 border rounded-lg">
                <h2 className="font-bold mb-2">質問</h2>
                <div className="min-h-[50px]">
                  {ownerInput || '質問はまだありません'}
                </div>
              </div>

              {/* キャラクター回答エリア */}
              <div className="grid grid-cols-3 gap-4">
                {characters.map((character) => {
                  const characterResponse = characterResponses.find(resp => resp.characterId === character.id);
                  return (
                    <div key={character.id} className="border rounded-lg p-4">
                      <div className="mb-4">
                        <h2 className="font-bold text-lg mb-2">{character.name}</h2>
                        <div className="text-gray-600 space-y-1">
                          <div>Time: {formatTime(characterResponse?.responseTimestamp)}</div>
                          {characterResponse?.responseTime && (
                            <div>Diff: {characterResponse.responseTime.toFixed(2)}秒</div>
                          )}
                          {characterResponse?.tokensPerSecond && (
                            <div>{characterResponse.tokensPerSecond.toFixed(1)}token/sec</div>
                          )}
                        </div>
                      </div>
                      <div className="min-h-[200px]">
                        {characterResponse?.message || `${character.name}からの回答はまだありません`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </ChatProvider>
  );
}
