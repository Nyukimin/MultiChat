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
    setQuestion(currentQuestion); // 質問をstateに保存

    console.log('[Client] Submitting question:', {
      question: currentQuestion,
      selectedCharacters: selectedCharacters,
      timestamp: new Date().toISOString()
    });

    // 新しい質問が来たら、以前の応答をクリア
    setCharacterResponses([]);

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
        const params = new URLSearchParams({ prompt, llm });
        const eventSource = new EventSource(`/api/chat?${params.toString()}`);
        let retryCount = 0;
        const maxRetries = 3;
        let reconnectTimeout: NodeJS.Timeout;

        eventSource.onopen = () => {
          retryCount = 0; // 接続成功時にリトライカウントをリセット
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
        };

        eventSource.onerror = (error) => {
          // 接続が閉じられた場合
          if (eventSource.readyState === EventSource.CLOSED) {
            if (retryCount < maxRetries) {
              retryCount++;
              // 既存のタイムアウトをクリア
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
              }

              // 再接続を試みる
              reconnectTimeout = setTimeout(() => {
                eventSource.close();
                setupEventSource(prompt, llm);
              }, 1000 * retryCount); // 再試行間隔を徐々に増やす
            } else {
              eventSource.close();
              setError(`接続エラーが発生しました。再度お試しください。(${llm})`);
              setIsLoading(false);
            }
          }
        };

        eventSource.onmessage = (event) => {
          try {
            console.log(`${character.llm}：受信：${event.data}`);

            if (event.data === '[DONE]') {
              console.log('[フロントエンド] 完了シグナル受信');
              eventSource.close();
              setIsLoading(false);
              return;
            }

            // LLMごとのパース処理
            let text = '';
            switch (character.llm) {
              case 'gemini':
                const parseGeminiChunk = (data: string) => {
                  try {
                    const jsonStr = `[${data.replace(/\n/g, ',').replace(/,\s*$/, '')}]`;
                    const responses = JSON.parse(jsonStr);
                    return responses
                      .map((res: any) => res?.candidates?.[0]?.content?.parts?.[0]?.text || '')
                      .join('');
                  } catch (error) {
                    console.error('Geminiパースエラー:', error);
                    return '';
                  }
                };

                let geminiBuffer = '';
                geminiBuffer += event.data;
                console.log(`Gemini：生データ受信 -> ${event.data}`);

                try {
                  const text = parseGeminiChunk(geminiBuffer);
                  if (text) {
                    console.log(`Gemini：解析成功 -> ${text}`);
                    setCharacterResponses(prev => {
                      const newResponses = [...prev];
                      const responseIndex = newResponses.findIndex(r => r.characterId === character.id);
                      
                      if (responseIndex !== -1) {
                        console.log('[フロントエンド] 既存の応答を更新:', character.id);
                        newResponses[responseIndex] = {
                          ...newResponses[responseIndex],
                          message: (newResponses[responseIndex].message || '') + text,
                          responseTimestamp: new Date()
                        };
                      } else {
                        console.log('[フロントエンド] 新しい応答を追加:', character.id);
                        newResponses.push({
                          characterId: character.id,
                          message: text,
                          llmName: character.llm,
                          questionTimestamp: new Date(),
                          responseTimestamp: new Date()
                        });
                      }
                      return newResponses;
                    });
                    geminiBuffer = '';
                  }
                } catch (e) {
                  console.log('Gemini：部分データ待機中...');
                }
                break;
              case 'ollama':
                try {
                  console.log('[フロントエンド] Ollama パース前:', event.data);
                  const data = JSON.parse(event.data);
                  console.log('[フロントエンド] Ollama パース結果:', data);
                  text = data.response;
                } catch (e) {
                  console.warn('[フロントエンド] Ollamaのパースエラー:', e);
                  text = event.data;
                }
                break;
              case 'anthropic':
                text = event.data;
                break;
              default:
                console.warn('[フロントエンド] 未知のLLMタイプ:', character.llm);
                text = event.data;
            }

            console.log(`${character.llm}：パース後：${text}`);

            // 共通の表示処理
            setCharacterResponses(prev => {
              const newResponses = [...prev];
              const responseIndex = newResponses.findIndex(r => r.characterId === character.id);
              
              if (responseIndex !== -1) {
                console.log('[フロントエンド] 既存の応答を更新:', character.id);
                newResponses[responseIndex] = {
                  ...newResponses[responseIndex],
                  message: (newResponses[responseIndex].message || '') + text,
                  responseTimestamp: new Date()
                };
              } else {
                console.log('[フロントエンド] 新しい応答を追加:', character.id);
                newResponses.push({
                  characterId: character.id,
                  message: text,
                  llmName: character.llm,
                  questionTimestamp: new Date(),
                  responseTimestamp: new Date()
                });
              }
              return newResponses;
            });

          } catch (error) {
            console.error('[フロントエンド] エラー:', error);
            setError(`メッセージの処理中にエラーが発生しました: ${error.message}`);
            eventSource.close();
            setIsLoading(false);
          }
        };

        return eventSource;
      };

      setupEventSource(currentQuestion, character.llm);
    });

    setOwnerInput('');
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
