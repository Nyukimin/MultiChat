"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var factory_1 = require("../app/lib/ai_clients/factory");
function testFactory() {
    return __awaiter(this, void 0, void 0, function () {
        var client1, client2, originalKey, error_1, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('=== LLMClientFactory 動作確認 ===');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 12, , 13]);
                    // 1. 正常系：Anthropicクライアントの生成
                    console.log('\n1. Anthropicクライアントの生成テスト');
                    return [4 /*yield*/, factory_1.LLMClientFactory.getInstance('anthropic')];
                case 2:
                    client1 = _a.sent();
                    return [4 /*yield*/, factory_1.LLMClientFactory.getInstance('anthropic')];
                case 3:
                    client2 = _a.sent();
                    console.log('- 同一インスタンスの確認:', client1 === client2 ? '成功' : '失敗');
                    // 2. 異常系：APIキーが未設定の場合
                    console.log('\n2. APIキー未設定テスト');
                    originalKey = process.env.ANTHROPIC_API_KEY;
                    process.env.ANTHROPIC_API_KEY = '';
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, factory_1.LLMClientFactory.getInstance('anthropic')];
                case 5:
                    _a.sent();
                    console.log('- エラー発生せず（異常）');
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.log('- 適切なエラー発生を確認:', error_1.message);
                    return [3 /*break*/, 7];
                case 7:
                    process.env.ANTHROPIC_API_KEY = originalKey;
                    // 3. 異常系：未対応のLLMタイプを指定
                    console.log('\n3. 未対応LLMタイプテスト');
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, factory_1.LLMClientFactory.getInstance('unknown')];
                case 9:
                    _a.sent();
                    console.log('- エラー発生せず（異常）');
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _a.sent();
                    console.log('- 適切なエラー発生を確認:', error_2.message);
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_3 = _a.sent();
                    console.error('予期せぬエラーが発生:', error_3);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
testFactory();
