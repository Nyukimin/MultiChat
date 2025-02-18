export class RequestTrackerError extends Error {
  constructor(
    public code: string, 
    message: string, 
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RequestTrackerError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context
    };
  }
}
