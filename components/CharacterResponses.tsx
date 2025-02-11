import React, { useContext } from 'react';
import { ChatContext } from '@/app/lib/context/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function CharacterResponses() {
  const { characters, clearResponses } = useContext(ChatContext);

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button 
          onClick={clearResponses}
          className="text-sm text-red-500 hover:text-red-700"
        >
          全ての応答をクリア
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {characters.map((character) => (
          <Card key={character.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{character.name}</CardTitle>
                <div className="flex gap-2">
                  {character.personality && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                      {character.personality}
                    </span>
                  )}
                  {character.tone && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                      {character.tone}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="min-h-[150px] p-4 bg-gray-50 rounded relative">
                {character.isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner className="w-8 h-8 text-blue-500" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {character.response || '応答待ち...'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
