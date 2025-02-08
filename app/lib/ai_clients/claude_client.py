import os
import asyncio
import logging
from typing import Optional, Any
from dotenv import load_dotenv
from anthropic import Anthropic, APIError, APIConnectionError, APITimeoutError, RateLimitError
from anthropic.types import MessageParam
from .base import BaseAIClient

# ロギングの設定
logger = logging.getLogger(__name__)

# Claude APIの接続先を更新
claude_api_endpoint = "claude-3-haiku-20240307"

class ClaudeClient(BaseAIClient):
    """Claude APIクライアント"""
    
    def __init__(self):
        super().__init__("Claude")
        logger.info("Initializing Claude client...")
        
        # 環境変数の読み込み
        load_dotenv()
        
        # APIキーの取得
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("ANTHROPIC_API_KEY not found in environment variables")
            raise ValueError("ANTHROPIC_API_KEYが設定されていません")
        
        # クライアントの初期化
        self.client = Anthropic(api_key=api_key)
        self.model_name = "claude-3-opus-20240229"
        
        logger.info(f"Claude API client initialized successfully with model: {self.model_name}")
        logger.debug(f"Using API key starting with: {api_key[:10]}...")

    async def generate_response(self, prompt: str, image_data: Optional[Any] = None) -> str:
        """Claudeを使用して応答を生成"""
        try:
            # プロンプトの準備
            formatted_prompt = f"think in English, output in Japanese: 英語で検索、考察し、日本語で回答してください。\n\nHuman: {prompt}\n\nAssistant:"
            logger.debug(f"Formatted prompt for Claude: {formatted_prompt}")

            # メッセージの作成
            messages = [
                {
                    "role": "user",
                    "content": formatted_prompt
                }
            ]

            # 画像データがある場合は追加
            if image_data:
                logger.warning("Claude client does not support image processing yet")

            try:
                # APIリクエストの送信（非同期ループ内で同期的に実行）
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model=self.model_name,
                        messages=messages,
                        max_tokens=1000
                    )
                )
                
                logger.debug(f"Raw response from Claude: {response}")
                
                if response and response.content:
                    response_text = response.content[0].text
                    logger.info(f"Successfully received response from Claude: {response_text}")
                    return response_text
                else:
                    logger.error("Empty response from Claude API")
                    return "申し訳ありません。応答が空でした。"

            except APIError as api_error:
                error_msg = f"APIエラー: {str(api_error)}"
                logger.error(f"Claude API error: {error_msg}")
                return error_msg

            except APIConnectionError as conn_error:
                error_msg = f"接続エラー: {str(conn_error)}"
                logger.error(f"Claude API connection error: {error_msg}")
                return error_msg

            except APITimeoutError as timeout_error:
                error_msg = f"タイムアウト: {str(timeout_error)}"
                logger.error(f"Claude API timeout: {error_msg}")
                return error_msg

            except RateLimitError as rate_error:
                error_msg = f"レート制限: {str(rate_error)}"
                logger.error(f"Claude API rate limit: {error_msg}")
                return error_msg

        except Exception as e:
            error_msg = f"予期せぬエラー: {str(e)}"
            logger.error(f"Unexpected error in Claude client: {error_msg}")
            return error_msg