import React, { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatContext } from '@/app/lib/context/ChatContext';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessageToCharacters, ownerInput } = useContext(ChatContext);

  const handleSubmit = async () => {
    if (input.trim() === '') return;

    try {
      // オーナーの入力とメッセージを送信
      await sendMessageToCharacters(input);
      
      // 入力欄をクリア
      setInput('');
    } catch (error) {
      console.error('メッセージ送信中にエラーが発生しました:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Textarea
        placeholder="メッセージを入力してください..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[100px]"
      />
      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleSubmit}
          className="px-6"
          disabled={!input.trim()}
        >
          送信
        </Button>
      </div>
    </div>
  );
}
