/**
 * リクエストIDを生成する関数
 * 形式: REQ-XXXXXX (Xは6桁の数字)
 */
export function generateRequestId(): string {
  // 6桁のランダムな数字を生成
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `REQ-${randomNum}`;
}
