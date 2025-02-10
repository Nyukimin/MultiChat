"use client"

import React, { useState, useEffect } from 'react';
import { ChatProvider } from '@/app/lib/context/ChatContext';

interface LLMLog {
  timestamp: Date;
  characterId: string;
  instruction: string;
  response: string;
}

interface CharacterResponse {
  characterId: string;
  message: string;
}

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [ownerInput, setOwnerInput] = useState('');
  const [characterResponses, setCharacterResponses] = useState<CharacterResponse[]>([]);
  const [llmLogs, setLlmLogs] = useState<LLMLog[]>([]);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [question, setQuestion] = useState('');

  // キャラクターリストの定義
  const characters = [
    {
      id: 'alice',
      name: 'アリス',
      avatar: '/avatars/alice.png',
      description: '明るく活発な少女'
    },
    {
      id: 'bob',
      name: 'ボブ',
      avatar: '/avatars/bob.png',
      description: '冷静で論理的な青年'
    },
    {
      id: 'carol',
      name: 'キャロル',
      avatar: '/avatars/carol.png',
      description: '優しく思いやりのある女性'
    }
  ];

  const handleSendInstruction = async () => {
    if (!ownerInput.trim()) return;

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
      
      // 各キャラクターの応答をログに追加
      const newLogs = data.responses.map((resp: { characterId: string; message: string }) => ({
        timestamp: new Date(),
        characterId: resp.characterId,
        instruction: ownerInput,
        response: resp.message
      }));

      setLlmLogs(prevLogs => [...newLogs, ...prevLogs]); // 新しいログを先頭に追加
      setCharacterResponses(data.responses); // キャラクターの回答を更新
      setOwnerInput('');
    } catch (error) {
      console.error('エラー:', error);
      // エラーをログに追加
      setLlmLogs(prevLogs => [{
        timestamp: new Date(),
        characterId: 'system',
        instruction: ownerInput,
        response: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      }, ...prevLogs]);
    }
  };

  // キャラクター名を取得するヘルパー関数
  const getCharacterName = (id: string) => {
    const character = characters.find(c => c.id === id);
    return character ? character.name : id;
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
                  <div key={character.id} className="flex items-center space-x-2 mb-2">
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
                {characters.map((character) => (
                  <div key={character.id} className="border rounded-lg p-4">
                    <h2 className="font-bold mb-2">{character.name}回答</h2>
                    <div className="min-h-[200px]">
                      {characterResponses.find(resp => resp.characterId === character.id)?.message || 
                       `${character.name}からの回答はまだありません`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LLMログセクション */}
          <div className="max-w-5xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4">LLMのログ</h2>
            <div className="space-y-4">
              {llmLogs.map((log, index) => (
                <div key={index} className="bg-white/90 p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-purple-600">
                      {getCharacterName(log.characterId)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {log.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-600 font-medium">指示:</span>
                    <p className="text-gray-800 ml-2">{log.instruction}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">応答:</span>
                    <p className="text-gray-800 ml-2 whitespace-pre-wrap">{log.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </ChatProvider>
  );
}
