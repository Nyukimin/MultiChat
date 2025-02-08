import React, { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatContext } from '@/app/lib/context/ChatContext';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessageToCharacters } = useContext(ChatContext);

  async function generateResponse(prompt: string) {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('APIレスポンスエラー');
      }

      const data = await response.json();
      
      // エラーハンドリング
      if (data.error) {
        console.error('API呼び出しエラー:', data.error);
        return null;
      }

      return data.message;
    } catch (error) {
      console.error('レスポンス生成中にエラーが発生:', error);
      return null;
    }
  }

  const handleSubmit = async () => {
    if (input.trim() === '') return;

    try {
      // オーナーの入力を全キャラクターに送信
      const response = await generateResponse(input);
      if (response) {
        await sendMessageToCharacters(response);
      }
      
      // 入力欄をクリア
      setInput('');
    } catch (error) {
      console.error('メッセージ送信中にエラーが発生しました:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Textarea
        placeholder="メッセージを入力してください..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full min-h-[100px]"
      />
      <Button 
        onClick={handleSubmit}
        className="self-end"
      >
        送信
      </Button>
    </div>
  );
}
