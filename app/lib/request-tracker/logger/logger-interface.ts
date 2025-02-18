export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// ユーザー情報のインターフェース
export interface UserInfo {
  id?: string;
  name?: string;
  role?: 'user' | 'system' | 'assistant';
}

export interface LogEntry {
  timestamp: string;
  provider: string;
  level: LogLevel;
  message: string;
  user?: UserInfo;
  context?: Record<string, any>;
}

export interface Logger {
  log(
    provider: string, 
    level: LogLevel, 
    message: string, 
    options?: {
      user?: UserInfo;
      context?: Record<string, any>;
    }
  ): void;

  debug(
    provider: string, 
    message: string, 
    options?: {
      user?: UserInfo;
      context?: Record<string, any>;
    }
  ): void;

  info(
    provider: string, 
    message: string, 
    options?: {
      user?: UserInfo;
      context?: Record<string, any>;
    }
  ): void;

  warn(
    provider: string, 
    message: string, 
    options?: {
      user?: UserInfo;
      context?: Record<string, any>;
    }
  ): void;

  error(
    provider: string, 
    message: string, 
    options?: {
      user?: UserInfo;
      context?: Record<string, any>;
    }
  ): void;
}
