export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  STREAM_ERROR = 'STREAM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR'
}

export class ProviderError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = 'ProviderError';
  }

  static fromError(error: Error, provider: string): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    // エラーの種類に応じて適切なエラーコードを設定
    let code = ErrorCode.API_ERROR;
    if (error.message.includes('API key')) {
      code = ErrorCode.INITIALIZATION_ERROR;
    } else if (error.message.includes('rate limit')) {
      code = ErrorCode.RATE_LIMIT_ERROR;
    }

    return new ProviderError(code, error.message, provider, error);
  }
}
