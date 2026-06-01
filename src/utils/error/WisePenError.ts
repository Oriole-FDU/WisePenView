export type WisePenErrorSource = 'network' | 'http' | 'api' | 'client';

export interface WisePenErrorOptions {
  code: number;
  source: WisePenErrorSource;
  serverMsg?: string;
  message?: string;
  meta?: Record<string, unknown>;
  cause?: unknown;
}

/** 统一的前端错误类型：网络 / HTTP / 后端业务 / 客户端校验 */
export class WisePenError extends Error {
  readonly code: number;
  readonly source: WisePenErrorSource;
  readonly serverMsg?: string;
  readonly meta?: Record<string, unknown>;

  constructor(options: WisePenErrorOptions) {
    const displayMessage = options.message ?? options.serverMsg ?? `Error ${options.code}`;
    super(displayMessage, { cause: options.cause });
    this.name = 'WisePenError';
    this.code = options.code;
    this.source = options.source;
    this.serverMsg = options.serverMsg;
    this.meta = options.meta;
  }
}

export const isWisePenError = (err: unknown): err is WisePenError => err instanceof WisePenError;
