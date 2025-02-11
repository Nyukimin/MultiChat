'use server';
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicClient = void 0;
var sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
var config_1 = require("../config/config");
var AnthropicClient = /** @class */ (function () {
    function AnthropicClient() {
        this.initialized = false;
        var config = (0, config_1.getConfig)();
        if (!config.anthropic.apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set');
        }
        this.client = new sdk_1.default({
            apiKey: config.anthropic.apiKey,
        });
    }
    AnthropicClient.prototype.ensureInitialized = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.initialized)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.messages.create({
                                model: 'claude-3-sonnet-20241022',
                                max_tokens: 1,
                                messages: [{ role: 'user', content: 'test' }]
                            })];
                    case 2:
                        _a.sent();
                        this.initialized = true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Anthropic client initialization failed:', error_1);
                        throw new Error('Failed to initialize Anthropic client');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AnthropicClient.prototype.generate = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            var config, response, content, error_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.ensureInitialized()];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        config = (0, config_1.getConfig)();
                        return [4 /*yield*/, this.client.messages.create({
                                model: 'claude-3-sonnet-20241022',
                                max_tokens: (options === null || options === void 0 ? void 0 : options.maxTokens) || config.anthropic.maxTokens,
                                temperature: (options === null || options === void 0 ? void 0 : options.temperature) || config.anthropic.temperature,
                                system: options === null || options === void 0 ? void 0 : options.systemPrompt,
                                messages: [{
                                        role: message.role,
                                        content: message.content
                                    }]
                            })];
                    case 3:
                        response = _e.sent();
                        content = response.content[0];
                        if ('text' in content) {
                            return [2 /*return*/, {
                                    content: content.text,
                                    usage: {
                                        promptTokens: (_a = response.usage) === null || _a === void 0 ? void 0 : _a.input_tokens,
                                        completionTokens: (_b = response.usage) === null || _b === void 0 ? void 0 : _b.output_tokens,
                                        totalTokens: (((_c = response.usage) === null || _c === void 0 ? void 0 : _c.input_tokens) || 0) + (((_d = response.usage) === null || _d === void 0 ? void 0 : _d.output_tokens) || 0)
                                    }
                                }];
                        }
                        else {
                            throw new Error('Unexpected response format from Anthropic API');
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _e.sent();
                        console.error('Anthropic API Error:', error_2);
                        throw new Error('Failed to generate response from Anthropic API');
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return AnthropicClient;
}());
exports.AnthropicClient = AnthropicClient;
