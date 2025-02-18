import React, { createContext, useState, useCallback, ReactNode } from 'react';
import config from '../config/config';
import { getCharacterResponse, getMultiCharacterResponses } from '@/app/lib/api/characterApi';

// キャラクターの型定義
export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  selected: boolean;
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
  characters: Character[];
  sendMessageToCharacters: (message: string) => Promise<void>;
}

// チャットコンテキストの作成
export const ChatContext = createContext<ChatContextType>({
  messages: [],
  characters: [],
  sendMessageToCharacters: async () => {},
});

// チャットプロバイダーの型定義
interface ChatProviderProps {
  children: ReactNode;
}

// チャットプロバイダーコンポーネント
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  // メッセージを全キャラクターに送信
  const sendMessageToCharacters = useCallback(async (message: string) => {
    try {
      const selectedCharacters = characters.filter(c => c.selected);
      if (selectedCharacters.length === 0) return;

      if (selectedCharacters.length === 1) {
        // 単一キャラクターの場合
        const character = selectedCharacters[0];
        const response = await getCharacterResponse(character, message);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          characterId: character.id,
          content: response,
          timestamp: new Date()
        }]);
      } else {
        // 複数キャラクターの場合
        const responses = await getMultiCharacterResponses(selectedCharacters, message);
        
        const newMessages = Array.from(responses.entries()).map(([characterId, content]) => ({
          id: Date.now().toString(),
          characterId,
          content,
          timestamp: new Date()
        }));

        setMessages(prev => [...prev, ...newMessages]);
      }
    } catch (error) {
      console.error('メッセージ送信中にエラーが発生:', error);
    }
  }, [characters]);

  return (
    <ChatContext.Provider value={{ messages, characters, sendMessageToCharacters }}>
      {children}
    </ChatContext.Provider>
  );
};
