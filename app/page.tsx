"use client"

import React, { useState, useEffect } from 'react';
import { ChatProvider } from '@/app/lib/context/ChatContext';
import { getEnv, isDebugMode, getChatSpeed } from '@/app/lib/config';

interface CharacterResponse {
  characterId: string;
  message: string;
  llmName: string;
  responseTime?: number;
  tokensPerSecond?: number;
  questionTimestamp?: Date;
  responseTimestamp?: Date;
  error?: string;
}

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [ownerInput, setOwnerInput] = useState('');
  const [characterResponses, setCharacterResponses] = useState<CharacterResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  // キャラクターリストの定義
  const characters = [
    {
      id: 'alice',
      name: 'アリス',
      llm: 'claude',
      avatar: '/avatars/alice.png',
      description: '明るく活発な少女'
    },
    {
      id: 'bob',
      name: 'ボブ',
      llm: 'gemini',
      avatar: '/avatars/bob.png',
      description: '知的で冷静な青年'
    },
    {
      id: 'carol',
      name: 'キャロル',
      llm: 'ollama',
      avatar: '/avatars/carol.png',
      description: '優しく思慮深い女性'
    }
  ];

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      }
      return [...prev, characterId];
    });
  };

  const handleSubmit = async () => {
    const currentQuestion = ownerInput;
    if (!currentQuestion.trim()) return;

    setIsLoading(true);
    setError(null);

    console.log('[Client] Submitting question:', {
      question: currentQuestion,
      selectedCharacters: selectedCharacters,
      timestamp: new Date().toISOString()
    });

    // 選択されたキャラクターごとにストリーミングを開始
    selectedCharacters.forEach(characterId => {
      const character = characters.find(c => c.id === characterId);
      if (!character) {
        console.error('[Client] Character not found:', characterId);
        return;
      }

      console.log('[Client] Setting up stream for character:', {
        id: character.id,
        name: character.name,
        llm: character.llm
      });

      // SSEイベントハンドラーの設定
      const setupEventSource = (prompt: string, llm: string) => {
        console.log('[Client] Initializing SSE connection:', {
          promptPreview: prompt.slice(0, 50),
          llm,
          timestamp: new Date().toISOString()
        });

        const params = new URLSearchParams({ prompt, llm });
        console.log('[Client] Request URL:', `/api/chat?${params.toString()}`);

        const eventSource = new EventSource(`/api/chat?${params.toString()}`);
        let retryCount = 0;
        const maxRetries = 3;

        eventSource.onopen = () => {
          console.log('[SSE] Connection opened:', {
            readyState: eventSource.readyState,
            url: eventSource.url,
            timestamp: new Date().toISOString()
          });
          retryCount = 0; // 接続成功時にリトライカウントをリセット
        };

        eventSource.onmessage = (event) => {
          console.log('[SSE] Message received:', {
            eventType: event.type,
            dataPreview: event.data.slice(0, 200),
            timestamp: new Date().toISOString()
          });

          try {
            if (event.data === '[DONE]') {
              console.log('[SSE] Stream completed');
              eventSource.close();
              setIsLoading(false);
              return;
            }

            const data = JSON.parse(event.data);
            console.log('[SSE] Parsed data:', {
              type: typeof data,
              keys: Object.keys(data),
              textPreview: data.text?.slice(0, 50)
            });

            if (data.text) {
              setCharacterResponses(prev => {
                const newResponses = [...prev];
                const responseIndex = newResponses.findIndex(r => r.characterId === character.id);
                
                console.log('[Client] Updating response:', {
                  characterId: character.id,
                  responseIndex,
                  currentText: data.text.slice(0, 50)
                });

                if (responseIndex !== -1) {
                  newResponses[responseIndex] = {
                    ...newResponses[responseIndex],
                    message: (newResponses[responseIndex].message || '') + data.text,
                    responseTimestamp: new Date()
                  };
                } else {
                  newResponses.push({
                    characterId: character.id,
                    message: data.text,
                    llmName: character.llm,
                    questionTimestamp: new Date(),
                    responseTimestamp: new Date()
                  });
                }
                return newResponses;
              });
            }
          } catch (error) {
            console.error('[SSE] Message processing error:', {
              error: error.message,
              data: event.data
            });
            setError(`メッセージの処理中にエラーが発生しました: ${error.message}`);
            eventSource.close();
            setIsLoading(false);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Error:', {
            error: error,
            readyState: eventSource.readyState,
            timestamp: new Date().toISOString()
          });

          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE] Connection closed');
            if (retryCount < maxRetries) {
              console.log('[SSE] Attempting to reconnect...', {
                attempt: retryCount + 1,
                maxRetries
              });
              retryCount++;
              setTimeout(() => setupEventSource(prompt, llm), 1000 * retryCount);
            } else {
              setError(`${character.name}からの応答中にエラーが発生しました`);
              setIsLoading(false);
            }
            eventSource.close();
          }
        };
      };

      setupEventSource(currentQuestion, character.llm);
    });

    setOwnerInput('');
    setQuestion(currentQuestion);
  };

  // デバッグモードの確認
  if (isDebugMode()) {
    console.log('Chat Speed:', getChatSpeed());
    console.log('Available Providers:', {
      claude: getEnv('anthropic') ? 'Available' : 'Not available',
      gemini: getEnv('gemini') ? 'Available' : 'Not available'
    });
  }

  return (
    <ChatProvider>
      <main className="min-h-screen p-8 bg-gradient-to-br from-pink-100 to-blue-100">
        <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <div className="flex gap-8">
            {/* 左側エリア */}
            <div className="w-1/3">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">オーナー入力</h2>
                  <textarea
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    className="w-full h-32 p-4 border rounded-lg resize-none"
                    placeholder="質問を入力してください"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-4">キャラクター選択</h2>
                  <div className="space-y-2">
                    {characters.map((character) => (
                      <label key={character.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedCharacters.includes(character.id)}
                          onChange={() => handleCharacterSelect(character.id)}
                          className="w-4 h-4"
                        />
                        <div>
                          <div className="font-medium">{character.name}</div>
                          <div className="text-sm text-gray-500">({character.llm})</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 p-2 border border-red-200 rounded-lg bg-red-50">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
                >
                  {isLoading ? '送信中...' : '送信'}
                </button>
              </div>
            </div>

            {/* 右側エリア */}
            <div className="w-2/3">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">質問</h2>
                  <div className="p-4 border rounded-lg min-h-[50px] bg-white">
                    {question || 'まだ質問はありません'}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-4">応答</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {characters.map((character) => {
                      const response = characterResponses.find(r => r.characterId === character.id);
                      return (
                        <div key={character.id} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-bold">{character.name}</span>
                              <span className="text-sm text-gray-500 ml-2">({character.llm})</span>
                            </div>
                            {response?.responseTime && (
                              <div className="text-sm text-gray-500">
                                応答時間: {response.responseTime.toFixed(2)}秒
                              </div>
                            )}
                          </div>
                          <div className="min-h-[280px] whitespace-pre-wrap">
                            {response?.error ? (
                              <div className="text-red-500">{response.error}</div>
                            ) : response?.message ? (
                              response.message
                            ) : (
                              `${character.name}からの応答はまだありません`
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ChatProvider>
  );
}
