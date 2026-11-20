export const MAX_CACHED_RUNTIMES = 5;

export interface RouterRuntimePort {
  readonly sessionId: string;
  bootstrap(options: { isNewSession: boolean }): Promise<void>;
  dispose(): void;
  isStreaming?(): boolean;
}

export interface FocusOptions {
  isNewSession?: boolean;
  createRuntime: () => RouterRuntimePort;
}

export interface ChatTurnRuntimeRouter {
  readonly maxCached: number;
  getActiveSessionId(): string | null;
  get(sessionId: string): RouterRuntimePort | undefined;
  getActive(): RouterRuntimePort | undefined;
  focus(sessionId: string | null, options?: FocusOptions): Promise<RouterRuntimePort | null>;
  dispose(sessionId: string): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
