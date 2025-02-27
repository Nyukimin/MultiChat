"use client"

import React, { useState, useEffect, useContext, useRef } from 'react';
import { ChatProvider, ChatContext } from '@/app/lib/context/ChatContext';
import { getEnv, isDebugMode, getChatSpeed } from '@/app/lib/config';

// 拡張されたロガーの型定義
interface ExtendedLogger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug?: (message: string, ...args: any[]) => void;
  setRequestId: (requestId: string) => void;
  apiRequest: (llm: string, prompt: string, requestId?: string) => void;
  apiResponse: (llm: string, data: string, requestId?: string) => void;
  apiParsedResponse: (llm: string, text: string, responseTime?: number, requestId?: string) => void;
  clearLogQueue: () => void;
  flushLogQueue: () => void;
}

// デフォルトのロガー実装
const defaultLogger: ExtendedLogger = {
  info: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    console.log(`[Client] ${fullMessage}`);
  },
  warn: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    console.warn(`[Client] ${fullMessage}`);
  },
  error: (message: string, ...args: any[]) => {
    const fullMessage = args.length > 0 
      ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
      : message;
    console.error(`[Client] ${fullMessage}`);
  },
  debug: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' 
    ? (message: string, ...args: any[]) => {
        const fullMessage = args.length > 0 
          ? `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}` 
          : message;
        console.debug(`[Client] ${fullMessage}`);
      }
    : undefined,
  setRequestId: (requestId: string) => {
    console.log(`Request ID: ${requestId}`);
  },
  apiRequest: (llm: string, prompt: string, requestId?: string) => {
    console.log(`API Request - LLM: ${llm}, Prompt: ${prompt}, Request ID: ${requestId ?? 'N/A'}`);
  },
  apiResponse: (llm: string, data: string, requestId?: string) => {
    console.log(`API Response - LLM: ${llm}, Data: ${data}, Request ID: ${requestId ?? 'N/A'}`);
  },
  apiParsedResponse: (llm: string, text: string, responseTime?: number, requestId?: string) => {
    console.log(`API Parsed Response - LLM: ${llm}, Text: ${text}, Response Time: ${responseTime ?? 'N/A'}, Request ID: ${requestId ?? 'N/A'}`);
  },
  clearLogQueue: () => {
    console.log('Log queue cleared');
  },
  flushLogQueue: () => {
    console.log('Log queue flushed');
  }
};

// nullセーフなロガー
const logger: ExtendedLogger = new Proxy(defaultLogger, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof ExtendedLogger];
    }
    // デフォルトの空の関数を返す
    return () => {};
  }
});

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

// リクエスト番号を生成する関数
const generateRequestId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [ownerInput, setOwnerInput] = useState('');
  const [characterResponses, setCharacterResponses] = useState<CharacterResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const { messages } = useContext(ChatContext);
  
  // アクティブなEventSourceを追跡するためのRef
  const activeEventSources = useRef<Map<string, EventSource>>(new Map());

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

  // 既存のリクエストを中断する関数
  const abortActiveRequests = () => {
    logger.info('[フロントエンド] 既存のリクエストを中断します');
    activeEventSources.current.forEach((source, characterId) => {
      logger.info(`[フロントエンド] ${characterId}のリクエストを中断`);
      source.close();
    });
    activeEventSources.current.clear();
  };

  const handleSubmit = async () => {
    const currentQuestion = ownerInput;
    if (!currentQuestion.trim()) return;

    // 既存のリクエストを中断
    abortActiveRequests();

    setIsLoading(true);
    setError(null);
    setQuestion(currentQuestion); // 質問をstateに保存

    logger.info('[Client] Submitting question:', {
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
        logger.error('[Client] Character not found:', characterId);
        return;
      }

      logger.info('[Client] Setting up stream for character:', {
        id: character.id,
        name: character.name,
        llm: character.llm
      });

      // EventSourceのセットアップ
      const setupEventSource = (prompt: string, llm: string) => {
        // リクエスト番号を生成
        const requestId = generateRequestId();
        
        // ロガーにリクエストIDを設定
        logger.setRequestId(requestId);
        
        // APIリクエストをログに記録
        logger.apiRequest(character.llm, prompt, requestId);
        
        // 既存のEventSourceがあれば閉じる
        if (activeEventSources.current.has(character.id)) {
          activeEventSources.current.get(character.id)?.close();
        }

        const encodedPrompt = encodeURIComponent(prompt);
        const encodedLLM = encodeURIComponent(llm);
        const encodedRequestId = encodeURIComponent(requestId);
        const eventSource = new EventSource(`/api/chat?prompt=${encodedPrompt}&llm=${encodedLLM}&requestId=${encodedRequestId}`);
        
        // 新しいEventSourceを保存
        activeEventSources.current.set(character.id, eventSource);

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
              // EventSourceをMapから削除
              activeEventSources.current.delete(character.id);
            }
          }
        };

        eventSource.onmessage = (event) => {
          try {
            logger.apiResponse(character.llm, event.data, requestId);

            if (event.data === '[DONE]') {
              logger.info('[フロントエンド] 完了シグナル受信', requestId);
              eventSource.close();
              // EventSourceをMapから削除
              activeEventSources.current.delete(character.id);
              
              // すべてのリクエストが完了したかチェック
              if (activeEventSources.current.size === 0) {
                setIsLoading(false);
              }
              return;
            }

            // LLMごとのパース処理
            let text = '';
            switch (character.llm) {
              case 'gemini':
                const parseGeminiChunk = (data: string) => {
                  try {
                    // サーバー側でパース済みのテキストをそのまま使用
                    return data;
                  } catch (error) {
                    logger.error('Geminiパースエラー:', error, requestId);
                    return '';
                  }
                };

                logger.debug(`Gemini：生データ受信 -> ${event.data}`, requestId);
                text = parseGeminiChunk(event.data);
                
                if (text) {
                  logger.apiParsedResponse('Gemini', text, undefined, requestId);
                  logger.debug(`Gemini：解析成功 -> ${text}`, requestId);
                  setCharacterResponses(prev => {
                    const newResponses = [...prev];
                    const responseIndex = newResponses.findIndex(r => r.characterId === character.id);
                    
                    if (responseIndex !== -1) {
                      logger.debug('[フロントエンド] 既存の応答を更新:', character.id);
                      newResponses[responseIndex] = {
                        ...newResponses[responseIndex],
                        message: (newResponses[responseIndex].message || '') + text,
                        responseTimestamp: new Date()
                      };
                    } else {
                      logger.debug('[フロントエンド] 新しい応答を追加:', character.id);
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
                }
                break;
              case 'ollama':
                try {
                  logger.debug('[フロントエンド] Ollama パース前:', event.data, requestId);
                  const data = JSON.parse(event.data);
                  logger.debug('[フロントエンド] Ollama パース結果:', data, requestId);
                  text = data.response;
                } catch (e) {
                  logger.warn('[フロントエンド] Ollamaのパースエラー:', e, requestId);
                  text = event.data;
                }
                break;
              case 'anthropic':
                text = event.data;
                break;
              default:
                logger.warn('[フロントエンド] 未知のLLMタイプ:', character.llm, requestId);
                text = event.data;
            }

            logger.apiParsedResponse(character.llm, text, undefined, requestId);

            // 共通の表示処理
            setCharacterResponses(prev => {
              const newResponses = [...prev];
              const responseIndex = newResponses.findIndex(r => r.characterId === character.id);
              
              if (responseIndex !== -1) {
                logger.debug('[フロントエンド] 既存の応答を更新:', character.id, requestId);
                newResponses[responseIndex] = {
                  ...newResponses[responseIndex],
                  message: (newResponses[responseIndex].message || '') + text,
                  responseTimestamp: new Date()
                };
              } else {
                logger.debug('[フロントエンド] 新しい応答を追加:', character.id, requestId);
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

          } catch (streamError) {
            const handleError = (error: Error | unknown) => {
              if (error instanceof Error) {
                logger.error('エラーが発生しました', error, requestId);
              } else {
                logger.error('不明なエラーが発生しました', requestId);
              }
            };
            handleError(streamError);
            setError(`メッセージの処理中にエラーが発生しました: ${streamError instanceof Error ? streamError.message : '不明なエラー'}`);
            eventSource.close();
            // EventSourceをMapから削除
            activeEventSources.current.delete(character.id);
            
            // すべてのリクエストが完了したかチェック
            if (activeEventSources.current.size === 0) {
              setIsLoading(false);
            }
          }
        };

        return eventSource;
      };

      setupEventSource(currentQuestion, character.llm);
    });

    setOwnerInput('');
  };

  // コンポーネントのアンマウント時にリソースをクリーンアップ
  useEffect(() => {
    // ページロード時にロガーのキューをクリア
    logger.clearLogQueue();
    
    // 初期リクエストIDを生成
    const initialRequestId = generateRequestId();
    logger.setRequestId(initialRequestId);
    logger.info(`ページがロードされました - 初期リクエストID: ${initialRequestId}`);

    return () => {
      // アンマウント時に全てのEventSourceを閉じる
      activeEventSources.current.forEach((es) => {
        es.close();
      });
      activeEventSources.current.clear();
      
      // ロガーのキューを強制的にフラッシュ
      logger.flushLogQueue();
      
      // アクティブなリクエストを中止
      abortActiveRequests();
    };
  }, []);

  // デバッグモードの確認
  if (isDebugMode()) {
    logger.debug('Chat Speed:', getChatSpeed());
    logger.debug('Available Providers:', {
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
