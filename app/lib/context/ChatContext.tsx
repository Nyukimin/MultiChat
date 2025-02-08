import React, { createContext, useState, useCallback, ReactNode } from 'react';
import config from '../config/config';
import { fetchCharacterResponses } from '@/app/lib/api/characterApi';

// キャラクターの型定義
export interface Character {
  id: string;
  name: string;
  response?: string;
  isLoading: boolean;
}

// コンテキストの型定義
interface ChatContextType {
  characters: Character[];
  sendMessageToCharacters: (message: string) => Promise<void>;
  clearResponses: () => void;
}

export const ChatContext = createContext<ChatContextType>({
  characters: [],
  sendMessageToCharacters: async () => {},
  clearResponses: () => {},
});

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // デフォルトのキャラクターリスト
  const [characters, setCharacters] = useState<Character[]>([
    { id: 'alice', name: 'アリス', response: '', isLoading: false },
    { id: 'bob', name: 'ボブ', response: '', isLoading: false },
    { id: 'carol', name: 'キャロル', response: '', isLoading: false }
  ]);

  // メッセージを全キャラクターに送信（非同期）
  const sendMessageToCharacters = useCallback(async (message: string) => {
    // 全キャラクターの状態を「読み込み中」に更新
    setCharacters(prev => prev.map(char => ({ ...char, isLoading: true, response: '' })));

    try {
      // 全キャラクターの応答を並列で非同期取得
      const responsePromises = characters.map(async (character) => {
        // 各キャラクターの応答を非同期で取得
        const response = await fetchCharacterResponses(character.id, message);
        
        // 応答を取得したキャラクターの状態を更新
        setCharacters(prev => prev.map(char => 
          char.id === character.id 
            ? { ...char, response, isLoading: false } 
            : char
        ));

        return { ...character, response, isLoading: false };
      });

      // すべての応答を待機（ただし、上記のsetCharactersにより、リアルタイムで描画される）
      await Promise.all(responsePromises);
    } catch (error) {
      console.error('キャラクターの応答取得中にエラーが発生しました:', error);
      
      // エラー時に全キャラクターの状態をリセット
      setCharacters(prev => prev.map(char => ({ 
        ...char, 
        response: 'エラーが発生しました。', 
        isLoading: false 
      })));
    }
  }, [characters]);

  // 応答をクリア
  const clearResponses = useCallback(() => {
    setCharacters(prev => prev.map(char => ({ 
      ...char, 
      response: '', 
      isLoading: false 
    })));
  }, []);

  return (
    <ChatContext.Provider value={{ 
      characters, 
      sendMessageToCharacters, 
      clearResponses 
    }}>
      {children}
    </ChatContext.Provider>
  );
};
