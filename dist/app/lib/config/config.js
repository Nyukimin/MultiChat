'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
// 設定オブジェクト
var config = {
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        maxTokens: 1000,
        temperature: 0.7,
    },
};
// 環境変数の検証
function validateConfig() {
    if (!config.anthropic.apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set');
    }
}
validateConfig();
// 設定を取得する関数
function getConfig() {
    return config;
}
