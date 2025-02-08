import os
import aiohttp
import logging
from typing import Optional, Any
from dotenv import load_dotenv
from .base import BaseAIClient

logger = logging.getLogger(__name__)

class OllamaClient(BaseAIClient):
    """Ollama APIクライアント"""
    
    def __init__(self):
        super().__init__("Ollama")
        load_dotenv()
        
        # ホストとモデルの設定
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "hf.co/mradermacher/phi-4-deepseek-R1K-RL-EZO-GGUF:Q4_K_S")
        logger.info(f"Ollama client initialized with model: {self.model}")

    async def generate_response(self, prompt: str, image_data: Optional[Any] = None) -> str:
        """Ollamaを使用して応答を生成"""
        try:
            # APIエンドポイントの設定
            url = f"{self.host}/api/generate"
            
            # リクエストデータの準備
            data = {
                "model": self.model,
                "prompt": f"think in English, output in Japanese: 英語で検索、考察し、日本語で回答してください。\n\nHuman: {prompt}\n\nAssistant:",
                "stream": False
            }
            
            logger.debug(f"Sending request to Ollama API: {url}")
            logger.debug(f"Using model: {self.model}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 404:
                        error_msg = await response.text()
                        logger.error(f"Model not found: {error_msg}")
                        return f"エラー: モデル '{self.model}' が見つかりません。Ollamaサーバーで正しいモデルがインストールされているか確認してください。"
                    
                    if response.status != 200:
                        error_msg = await response.text()
                        logger.error(f"Error from Ollama API: {error_msg}")
                        return f"APIエラー: {response.status}"
                    
                    result = await response.json()
                    response_text = result.get("response", "")
                    
                    # Markdown ブロックの除去
                    if '```' in response_text:
                        response_text = response_text.split('```')[-1].strip()
                    
                    return response_text

        except aiohttp.ClientError as e:
            logger.error(f"Network error: {str(e)}")
            return f"ネットワークエラー: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return f"予期せぬエラー: {str(e)}"

    def add_to_history(self, role: str, content: str):
        """会話履歴に追加"""
        try:
            super().add_to_history(role, content)
            logger.info(f"Adding to history: {role}: {content}")
        except Exception as e:
            logger.error(f"Error adding to history: {str(e)}")
            raise

    def clear_history(self):
        """会話履歴をクリア"""
        try:
            super().clear_history()
            logger.info("Clearing history")
        except Exception as e:
            logger.error(f"Error clearing history: {str(e)}")
            raise