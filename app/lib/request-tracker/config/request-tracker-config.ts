export interface RequestTrackerConfig {
  maxRequests?: number;
  expirationTime?: number;
  persistenceStrategy?: 'memory' | 'redis' | 'file';
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  clusterMode?: boolean;
}

export const defaultConfig: RequestTrackerConfig = {
  maxRequests: 1000,
  expirationTime: 3600, // 1時間
  persistenceStrategy: 'memory',
  logLevel: 'info',
  clusterMode: false
};
