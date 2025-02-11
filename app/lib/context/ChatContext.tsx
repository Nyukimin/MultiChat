'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { fetchCharacterResponses } from '@/app/lib/api/characterApi';
import { loadCharacters as loadCharacterConfig } from '@/app/lib/utils/characterLoader';

// キャラクターの型定義
export interface Character {
  id: string;
  name: string;
  response?: string;
  isLoading: boolean;
  personality?: string;
  tone?: string;
}

// コンテキストの型定義
interface ChatContextType {
  characters: Character[];
  sendMessageToCharacters: (message: string) => Promise<void>;
  clearResponses: () => void;
  ownerInput: string;
  setOwnerInput: (input: string) => void;
}

export const ChatContext = createContext<ChatContextType>({
  characters: [],
  sendMessageToCharacters: async () => {},
  clearResponses: () => {},
  ownerInput: '',
  setOwnerInput: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [ownerInput, setOwnerInput] = useState('');

  // 初期化
  React.useEffect(() => {
    const initializeCharacters = async () => {
      try {
        const loadedCharacters = await loadCharacterConfig();
        setCharacters(loadedCharacters.map(char => ({
          ...char,
          isLoading: false,
        })));
      } catch (error) {
        console.error('キャラクターの初期化に失敗しました:', error);
      }
    };

    initializeCharacters();
  }, []);

  // メッセージを全キャラクターに送信（非同期）
  const sendMessageToCharacters = useCallback(async (message: string) => {
    // 全キャラクターの状態を「読み込み中」に更新
    setCharacters(prev => prev.map(char => ({
      ...char,
      isLoading: true,
    })));

    try {
      const responses = await fetchCharacterResponses(message, characters);
      
      // レスポンスを反映
      setCharacters(prev => prev.map(char => {
        const response = responses.find(r => r.id === char.id);
        return {
          ...char,
          response: response?.response,
          isLoading: false,
        };
      }));
    } catch (error) {
      console.error('メッセージの送信に失敗しました:', error);
      // エラー時は全キャラクターの読み込み状態をリセット
      setCharacters(prev => prev.map(char => ({
        ...char,
        isLoading: false,
      })));
    }
  }, [characters]);

  // レスポンスをクリア
  const clearResponses = useCallback(() => {
    setCharacters(prev => prev.map(char => ({
      ...char,
      response: undefined,
    })));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        characters,
        sendMessageToCharacters,
        clearResponses,
        ownerInput,
        setOwnerInput,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
