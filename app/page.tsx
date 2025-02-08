"use client"

import { useState } from 'react'

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([])
  const [question, setQuestion] = useState('')

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-pink-100 to-blue-100">
      <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
        <div className="flex gap-8">
          {/* 左側エリア */}
          <div className="w-1/4 flex flex-col gap-6">
            {/* オーナー入力エリア */}
            <div>
              <textarea
                className="w-full h-48 p-4 rounded-lg border border-pink-200 bg-pink-50 focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none"
                placeholder="オーナー入力"
              />
            </div>

            {/* キャラクター選択 */}
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((num) => (
                <label key={num} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCharacters.includes(num)}
                    onChange={() => {
                      setSelectedCharacters(prev =>
                        prev.includes(num)
                          ? prev.filter(n => n !== num)
                          : [...prev, num]
                      )
                    }}
                    className="w-5 h-5 rounded border-purple-300 text-purple-500 focus:ring-purple-200"
                  />
                  <span className="text-gray-700">キャラクター{num}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 右側エリア */}
          <div className="w-3/4 flex flex-col gap-6">
            {/* 質問エリア */}
            <div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full h-32 p-4 rounded-lg border border-blue-200 bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                placeholder="質問を入力してください"
              />
            </div>

            {/* 回答エリア */}
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className="p-4 rounded-lg bg-gradient-to-b from-purple-50 to-pink-50 border border-purple-100 shadow-sm"
                >
                  <h3 className="text-lg font-medium mb-2 text-purple-700">
                    キャラクター{num}の回答
                  </h3>
                  <textarea
                    className="w-full h-48 p-4 rounded-lg border border-purple-200 bg-white/70 focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
                    placeholder={`キャラクター${num}の回答`}
                    readOnly
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
