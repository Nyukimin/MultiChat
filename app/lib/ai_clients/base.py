from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAIClient(ABC):
    """AIクライアントの基本クラス"""
    
    def __init__(self, name: str):
        self.name = name
        self.history: List[Dict[str, Any]] = []
    
    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        """メッセージを受け取り、応答を生成する"""
        pass
    
    def add_to_history(self, role: str, content: str):
        """会話履歴に追加"""
        self.history.append({
            "role": role,
            "content": content
        })
    
    def clear_history(self):
        """会話履歴をクリア"""
        self.history = [] 