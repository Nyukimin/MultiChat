import google.generativeai as genai
from typing import Optional, Union
import os
import logging
from dotenv import load_dotenv
from .base import BaseAIClient
from PIL import Image
import base64
import io

# ロギングの設定
logger = logging.getLogger(__name__)

class GeminiClient(BaseAIClient):
    """Gemini APIクライアント"""
    
    def __init__(self):
        super().__init__("Gemini")
        logger.info("Initializing Gemini client...")
        load_dotenv()
        
        # APIキーの設定
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.error("GOOGLE_API_KEY not found in environment variables")
            raise ValueError("GOOGLE_API_KEYが設定されていません")
        
        try:
            genai.configure(api_key=api_key)
            logger.info("Gemini API configured successfully")
            
            # テキスト用モデルの初期化
            self.chat_model = genai.GenerativeModel('gemini-pro')
            self.chat = self.chat_model.start_chat(history=[])
            
            # 画像認識用モデルの初期化
            self.vision_model = genai.GenerativeModel('gemini-pro-vision')
            logger.info("Gemini models initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Gemini client: {str(e)}")
            raise

    def _process_image(self, image_data: Union[str, bytes, Image.Image]) -> Image.Image:
        """画像データを処理してPIL Imageオブジェクトに変換"""
        try:
            if isinstance(image_data, str):
                # Base64文字列の場合
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
                return Image.open(io.BytesIO(image_bytes))
            elif isinstance(image_data, bytes):
                # バイトデータの場合
                return Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                # すでにPIL Imageの場合
                return image_data
            else:
                raise ValueError("Unsupported image format")
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise
    
    async def generate_response(self, prompt: str, image_data: Optional[Union[str, bytes, Image.Image]] = None) -> str:
        """Geminiを使用して応答を生成"""
        logger.debug(f"Generating response for prompt: {prompt}")
        try:
            formatted_prompt = f"think in English, output in Japanese: 英語で検索、考察し、日本語で回答してください。\n\nHuman: {prompt}\n\nAssistant:"
            
            if image_data:
                try:
                    # 画像処理
                    image = self._process_image(image_data)
                    logger.info("Processing image with Gemini Vision")
                    response = self.vision_model.generate_content([formatted_prompt, image])
                except Exception as e:
                    logger.error(f"Error processing image: {str(e)}")
                    return f"画像処理エラー: {str(e)}"
            else:
                # テキストのみの処理
                response = self.chat.send_message(formatted_prompt)
            
            logger.debug(f"Response received from Gemini: {response.text}")
            return response.text
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return f"エラーが発生しました: {str(e)}"
    
    def add_to_history(self, role: str, content: str):
        """会話履歴に追加してGeminiのチャット履歴も更新"""
        try:
            super().add_to_history(role, content)
            logger.debug(f"Added to history - Role: {role}, Content: {content}")
        except Exception as e:
            logger.error(f"Error adding to history: {str(e)}")
            raise
    
    def clear_history(self):
        """会話履歴をクリアしてGeminiのチャットもリセット"""
        try:
            super().clear_history()
            self.chat = self.chat_model.start_chat(history=[])
            logger.info("Chat history cleared and reset")
        except Exception as e:
            logger.error(f"Error clearing history: {str(e)}")
            raise 