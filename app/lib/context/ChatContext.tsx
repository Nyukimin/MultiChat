import React, { createContext, useState, useCallback, ReactNode } from 'react';
import config from '../config/config';
import { getCharacterResponse } from '@/app/lib/api/characterApi';

// キャラクターの型定義
export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

// チャットメッセージの型定義
interface ChatMessage {
  id: string;
  characterId: string;
  content: string;
  timestamp: Date;
}

// チャットコンテキストの型定義
interface ChatContextType {
  messages: ChatMessage[];
  sendMessageToCharacters: (message: string) => Promise<void>;
}

// チャットコンテキストの作成
export const ChatContext = createContext<ChatContextType>({
  messages: [],
  sendMessageToCharacters: async () => {},
});

// チャットプロバイダーの型定義
interface ChatProviderProps {
  children: ReactNode;
}

// チャットプロバイダーコンポーネント
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // メッセージを全キャラクターに送信
  const sendMessageToCharacters = useCallback(async (message: string) => {
    try {
      // 選択されたキャラクターそれぞれに対してレスポンスを生成
      const characters: Character[] = []; // TODO: キャラクターリストを実装
      
      for (const character of characters) {
        const response = await getCharacterResponse(character, message);
        
        // 新しいメッセージを追加
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          characterId: character.id,
          content: response,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('メッセージ送信中にエラーが発生:', error);
    }
  }, []);

  return (
    <ChatContext.Provider value={{ messages, sendMessageToCharacters }}>
      {children}
    </ChatContext.Provider>
  );
};
