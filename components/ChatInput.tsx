import React, { useState } from 'react';
import { chatFetch } from '@/lib/apiClient';

interface ChatInputProps {
  onMessageSend?: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onMessageSend }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await chatFetch(message);
      
      // 成功時のコールバック
      onMessageSend?.(response.response);
      
      // メッセージをクリア
      setMessage('');
    } catch (err: any) {
      // エラーハンドリング
      if (err.status === 409) {
        setError('現在処理中です。少し待ってから再試行してください。');
      } else {
        setError('メッセージの送信中にエラーが発生しました。');
      }
      console.error('チャット送信エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="メッセージを入力..."
        disabled={isLoading}
      />
      <button 
        onClick={handleSend} 
        disabled={isLoading || !message.trim()}
      >
        {isLoading ? '送信中...' : '送信'}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default ChatInput;
