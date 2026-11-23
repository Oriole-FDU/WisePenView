export type SessionVisibility = 'foreground' | 'background';

export type SessionPhase = 'idle' | 'sending' | 'streaming' | 'canceling' | 'hanged' | 'error';

export type SessionBootstrapStatus = 'idle' | 'running' | 'ready' | 'failed';
