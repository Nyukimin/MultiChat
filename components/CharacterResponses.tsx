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
              <CardTitle>{character.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[100px] p-2 bg-gray-50 rounded relative">
                {character.isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner className="w-8 h-8 text-blue-500" />
                  </div>
                ) : (
                  character.response || '応答待ち...'
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
