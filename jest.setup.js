// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// テスト環境の設定
process.env.ANTHROPIC_API_KEY = 'test_key';
process.env.NODE_ENV = 'test';

// グローバルなモックの設定
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: 'test response' }],
          usage: {
            input_tokens: 10,
            output_tokens: 20
          }
        })
      }
    }))
  };
});
