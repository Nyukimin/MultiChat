"use client"

import React, { useState, useEffect } from 'react';
import { ChatProvider } from '@/app/lib/context/ChatContext';
import { ChatInput } from '@/components/ChatInput';
import { CharacterResponses } from '@/components/CharacterResponses';

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([])
  const [question, setQuestion] = useState('')
  const [serverConfig, setServerConfig] = useState<any>(null);

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

  useEffect(() => {
    // サーバーサイドの設定を取得
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => setServerConfig(data))
      .catch(err => console.error('設定の取得に失敗:', err));
  }, []);

  return (
    <ChatProvider>
      <main className="min-h-screen p-8 bg-gradient-to-br from-pink-100 to-blue-100">
        <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            マルチキャラクターチャットボット
          </h1>
          <div className="flex gap-8">
            {/* 左側エリア */}
            <div className="w-1/4 flex flex-col gap-6">
              {/* オーナー入力エリア */}
              <div>
                <textarea
                  className="w-full h-48 p-4 rounded-lg border border-pink-200 bg-pink-50 focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none"
                  placeholder="オーナー入力"
                />
              </div>

              {/* キャラクター選択 */}
              <div className="flex flex-col gap-3">
                {characters.map((character) => (
                  <label key={character.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCharacters.includes(character.id)}
                      onChange={() => {
                        setSelectedCharacters(prev =>
                          prev.includes(character.id)
                            ? prev.filter(id => id !== character.id)
                            : [...prev, character.id]
                        )
                      }}
                      className="w-5 h-5 rounded border-purple-300 text-purple-500 focus:ring-purple-200"
                    />
                    <span className="text-gray-700">{character.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 右側エリア */}
            <div className="w-3/4 flex flex-col gap-6">
              {/* 質問エリア */}
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full h-32 p-4 rounded-lg border border-blue-200 bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                  placeholder="質問を入力してください"
                />
              </div>

              {/* 回答エリア */}
              <div className="grid grid-cols-3 gap-4">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className="p-4 rounded-lg bg-gradient-to-b from-purple-50 to-pink-50 border border-purple-100 shadow-sm"
                  >
                    <h3 className="text-lg font-medium mb-2 text-purple-700">
                      {character.name}の回答
                    </h3>
                    <textarea
                      className="w-full h-48 p-4 rounded-lg border border-purple-200 bg-white/70 focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
                      placeholder={`${character.name}の回答`}
                      readOnly
                    />
                  </div>
                ))}
              </div>
              <ChatInput />
              <CharacterResponses />
            </div>
          </div>
        </div>
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-2xl font-bold mb-4">環境変数設定確認</h1>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold mb-2">サーバーサイドの設定</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(serverConfig, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">クライアントサイドの設定</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify({
                ollama: {
                  host: process.env.NEXT_PUBLIC_OLLAMA_HOST,
                  model: process.env.NEXT_PUBLIC_OLLAMA_MODEL,
                },
                app: {
                  chatSpeed: process.env.NEXT_PUBLIC_CHAT_SPEED,
                  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE,
                }
              }, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </ChatProvider>
  )
}
