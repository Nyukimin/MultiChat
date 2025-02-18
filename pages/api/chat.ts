import type { NextApiRequest, NextApiResponse } from 'next';

// リクエストキャッシュ
const requestCache = new Set<string>();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // メソッドチェック
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '許可されていないメソッドです' });
  }

  // リクエストIDの取得
  const requestId = req.headers['x-request-id'] as string;
  
  // リクエストIDのバリデーション
  if (!requestId) {
    return res.status(400).json({ error: 'リクエストIDが必要です' });
  }

  // リクエストボディのバリデーション
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'メッセージが空です' });
  }

  // 重複リクエスト検証
  if (requestCache.has(requestId)) {
    console.log(`重複リクエストを検出: ${requestId}`);
    return res.status(409).json({ error: '既に処理中のリクエストです' });
  }

  // リクエストをキャッシュに登録
  requestCache.add(requestId);

  // モックレスポンス
  const response = {
    message: {
      content: `You said: ${message}`
    }
  };

  // 5秒後にキャッシュから削除
  setTimeout(() => {
    requestCache.delete(requestId);
  }, 5000);
  
  return res.status(200).json({
    response: response.message.content,
    requestId
  });
}

// キャッシュクリーンアップ（古いエントリを定期的に削除）
setInterval(() => {
  const now = Date.now();
  for (const id of requestCache.values()) {
    // 10秒以上経過したエントリを削除
    // NOTE: Set には timestamp がないため、削除ロジックが変更されました。
    // requestCache.delete(id);
  }
}, 5000);
