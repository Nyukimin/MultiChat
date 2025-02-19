export enum ErrorCode {
  RateLimit = 'RATE_LIMIT',
  InvalidRequest = 'INVALID_REQUEST',
  ServerError = 'SERVER_ERROR'
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: ErrorCode
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  static fromError(error: Error, provider: string): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    // エラーの種類に応じて適切なエラーコードを設定
    let code = ErrorCode.ServerError;
    if (error.message.includes('rate limit')) {
      code = ErrorCode.RateLimit;
    } else if (error.message.includes('API key')) {
      code = ErrorCode.InvalidRequest;
    }

    return new ProviderError(error.message, code);
  }
}
