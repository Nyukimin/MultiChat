"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ErrorLogger = void 0;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var ErrorLogger = /** @class */ (function () {
    function ErrorLogger() {
    }
    ErrorLogger.logError = function (error_1, errorFile_1) {
        return __awaiter(this, arguments, void 0, function (error, errorFile, relatedFiles) {
            var errorInfo, logFile, logContent;
            if (relatedFiles === void 0) { relatedFiles = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        errorInfo = {
                            errorFile: path.resolve(errorFile),
                            errorMessage: error.message,
                            relatedFiles: relatedFiles.map(function (file) { return path.resolve(file); }),
                            timestamp: new Date().toISOString(),
                            stack: error.stack
                        };
                        // ログディレクトリが存在しない場合は作成
                        if (!fs.existsSync(this.logDir)) {
                            fs.mkdirSync(this.logDir, { recursive: true });
                        }
                        logFile = path.join(this.logDir, "error-".concat(errorInfo.timestamp.replace(/[:.]/g, '-'), ".log"));
                        logContent = this.formatErrorLog(errorInfo);
                        return [4 /*yield*/, fs.promises.writeFile(logFile, logContent, 'utf8')];
                    case 1:
                        _a.sent();
                        // コンソールにも出力（開発環境の場合）
                        if (process.env.NODE_ENV === 'development') {
                            console.error(logContent);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ErrorLogger.formatErrorLog = function (errorInfo) {
        return "\n\u30A8\u30E9\u30FC\u767A\u751F\u30D5\u30A1\u30A4\u30EB\uFF1A".concat(errorInfo.errorFile, "\n\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\uFF1A").concat(errorInfo.errorMessage, "\n\u95A2\u9023\u30D5\u30A1\u30A4\u30EB\uFF1A\n").concat(errorInfo.relatedFiles.map(function (file) { return "  - ".concat(file); }).join('\n'), "\n\u767A\u751F\u6642\u523B\uFF1A").concat(errorInfo.timestamp, "\n").concat(errorInfo.stack ? "\n\u30B9\u30BF\u30C3\u30AF\u30C8\u30EC\u30FC\u30B9\uFF1A\n".concat(errorInfo.stack) : '', "\n").trim();
    };
    ErrorLogger.logDir = path.join(process.cwd(), 'logs');
    return ErrorLogger;
}());
exports.ErrorLogger = ErrorLogger;
