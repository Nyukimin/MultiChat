import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ProviderConfig } from '../types/provider';

export class ConfigLoader {
  private static readonly CONFIG_DIR = path.join(process.cwd(), 'config', 'providers');
  private static readonly SCHEMA_PATH = path.join(ConfigLoader.CONFIG_DIR, 'provider-schema.yaml');

  static async loadProviderConfigs(): Promise<Map<string, ProviderConfig>> {
    const configs = new Map<string, ProviderConfig>();
    
    try {
      // スキーマの読み込み
      const schema = await this.loadSchema();
      
      // プロバイダー設定ファイルの読み込み
      const files = await fs.promises.readdir(this.CONFIG_DIR);
      
      for (const file of files) {
        if (file === 'provider-schema.yaml') continue;
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

        const filePath = path.join(this.CONFIG_DIR, file);
        const config = await this.loadYamlFile<ProviderConfig>(filePath);
        
        // TODO: スキーマバリデーション実装
        // validateConfig(config, schema);
        
        configs.set(config.name, config);
      }
      
      return configs;
    } catch (error) {
      console.error('設定ファイルの読み込みに失敗:', error);
      throw error;
    }
  }

  private static async loadSchema(): Promise<any> {
    return this.loadYamlFile(this.SCHEMA_PATH);
  }

  private static async loadYamlFile<T>(filePath: string): Promise<T> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return yaml.load(content) as T;
  }
}
