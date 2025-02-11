import { ErrorLogger } from '../../app/lib/utils/errorLogger';
import * as fs from 'fs';
import * as path from 'path';

describe('ErrorLogger', () => {
  const logDir = path.join(process.cwd(), 'logs');

  beforeEach(() => {
    // テスト前にlogsディレクトリをクリーンアップ
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true });
    }
  });

  it('エラーログを正しく出力できること', async () => {
    const testError = new Error('テストエラー');
    const errorFile = path.resolve(__dirname, '../../app/lib/utils/errorLogger.ts');
    const relatedFiles = [
      path.resolve(__dirname, '../../app/lib/ai_clients/factory.ts'),
      path.resolve(__dirname, '../../app/lib/types/ai.ts')
    ];

    await ErrorLogger.logError(testError, errorFile, relatedFiles);

    // logsディレクトリが作成されていることを確認
    expect(fs.existsSync(logDir)).toBe(true);

    // ログファイルが作成されていることを確認
    const files = fs.readdirSync(logDir);
    expect(files.length).toBe(1);
    
    // ログ内容を確認
    const logContent = fs.readFileSync(path.join(logDir, files[0]), 'utf8');
    expect(logContent).toContain('エラー発生ファイル');
    expect(logContent).toContain('テストエラー');
    expect(logContent).toContain('factory.ts');
    expect(logContent).toContain('ai.ts');
  });
});
