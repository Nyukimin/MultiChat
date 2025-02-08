import React, { useContext } from 'react';
import { ChatContext } from '@/app/lib/context/ChatContext';

export const CharacterResponses: React.FC = () => {
  const { messages } = useContext(ChatContext);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="p-4 bg-white rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <div className="font-medium">{message.characterId}</div>
            <div className="text-sm text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
          <div className="mt-2 text-gray-700">{message.content}</div>
        </div>
      ))}
    </div>
  );
};
