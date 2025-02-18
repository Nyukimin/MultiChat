import { Logger, LogLevel } from './logger-interface';

export class ConsoleLogger implements Logger {
  private currentLogLevel: LogLevel;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.currentLogLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return logLevels.indexOf(level) >= logLevels.indexOf(this.currentLogLevel);
  }

  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logMessage = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logMessage));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logMessage));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logMessage));
        break;
      case LogLevel.ERROR:
        console.error(JSON.stringify(logMessage));
        break;
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }
}
