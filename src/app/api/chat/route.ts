import { NextRequest, NextResponse } from 'next/server';
import { ProviderFactory } from '@/app/lib/providers/base/provider-factory';
import { ProviderConfig } from '@/app/lib/providers/base/ai-provider';
import { ProviderError, ErrorCode } from '@/app/lib/providers/base/provider-error';

// ストリーミングレスポンスのエンコーダー
const encoder = new TextEncoder();
