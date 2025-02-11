"use client"

import React, { useEffect } from 'react';
import { useState } from 'react'
import { ChatProvider } from '@/app/lib/context/ChatContext';
import { ChatInput } from '@/components/ChatInput';
import { CharacterResponses } from '@/components/CharacterResponses';
import { Character, loadCharacters } from '@/app/lib/utils/characterLoader';

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [ownerInput, setOwnerInput] = useState('');

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const loadedCharacters = await loadCharacters();
        setCharacters(loadedCharacters);
      } catch (error) {
        console.error('キャラクター設定の読み込みエラー:', error);
      }
    };
    fetchCharacters();
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
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
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
            <div className="flex-1">
              {/* チャット表示エリア */}
              <div className="mb-6">
                <CharacterResponses />
              </div>

              {/* 質問入力エリア */}
              <div>
                <ChatInput />
              </div>
            </div>
          </div>
        </div>
      </main>
    </ChatProvider>
  );
}
