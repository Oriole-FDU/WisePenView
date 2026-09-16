import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  isWisePenError,
  type WisePenError,
} from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';

import type { SpeechRecognitionCredential } from '../service/index.type';
import { XfyunResultAssembler } from './XfyunResultAssembler';

type UnknownRecord = Record<string, unknown>;

export type XfyunSpeechRecognizerState = 'idle' | 'connecting' | 'listening' | 'finishing';

export interface XfyunSpeechRecognizerOptions {
  credential: SpeechRecognitionCredential;
  mediaStream: MediaStream;
  processorModuleUrl: string;
  onText: (text: string) => void;
  onStateChange?: (state: XfyunSpeechRecognizerState) => void;
  onFinish?: (text: string) => void;
  onError?: (error: Error) => void;
}

const FINISH_TIMEOUT_MS = 5000;
const IFLYTEK_AUDIO_CONFIG = {
  format: 'audio/L16;rate=16000',
  encoding: 'raw',
  sampleRate: 16000,
  frameBytes: 1280,
  maxDurationMs: 55000,
} as const;
const IFLYTEK_BUSINESS_CONFIG = {
  language: 'zh_cn',
  domain: 'iat',
  accent: 'mandarin',
  dwa: 'wpgs',
  ptt: 1,
} as const;

let recognitionActive = false;

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function readProviderError(payload: UnknownRecord): WisePenError | null {
  if (payload.code === 0) return null;
  const code = typeof payload.code === 'number' ? payload.code : 'unknown';
  const message = typeof payload.message === 'string' ? payload.message : '未知错误';
  return createClientError(FRONTEND_CLIENT_ERROR.SPEECH_PROVIDER_FAILED, {
    providerCode: code,
    providerMessage: message,
  });
}

export class XfyunSpeechRecognizer {
  private readonly options: XfyunSpeechRecognizerOptions;
  private readonly assembler = new XfyunResultAssembler();
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: AudioWorkletNode | null = null;
  private maxDurationTimer: number | null = null;
  private finishTimer: number | null = null;
  private startResolve: (() => void) | null = null;
  private startReject: ((reason: Error) => void) | null = null;
  private started = false;
  private terminated = false;
  private ownsActiveSlot = false;
  private sentFirstFrame = false;
  private state: XfyunSpeechRecognizerState = 'idle';

  constructor(options: XfyunSpeechRecognizerOptions) {
    this.options = options;
  }

  start(): Promise<void> {
    if (recognitionActive) {
      return Promise.reject(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_ALREADY_ACTIVE));
    }
    recognitionActive = true;
    this.ownsActiveSlot = true;
    this.setState('connecting');

    return new Promise<void>((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;

      try {
        const socket = new WebSocket(this.options.credential.websocketUrl);
        this.socket = socket;
        socket.onopen = () => void this.handleSocketOpen();
        socket.onmessage = (event) => this.handleSocketMessage(event);
        socket.onerror = () =>
          this.fail(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CONNECTION_FAILED));
        socket.onclose = () => {
          if (!this.terminated) {
            this.fail(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CONNECTION_CLOSED));
          }
        };
      } catch (error) {
        this.fail(
          createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CONNECTION_FAILED, undefined, error)
        );
      }
    });
  }

  stop(): void {
    if (this.state !== 'listening' || this.terminated) return;

    this.setState('finishing');
    this.releaseAudioCapture();
    this.sendEndFrame();
    this.finishTimer = window.setTimeout(
      () => this.fail(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_FINISH_TIMEOUT)),
      FINISH_TIMEOUT_MS
    );
  }

  cancel(): void {
    if (this.terminated) return;
    const reject = this.startReject;
    this.releaseAll();
    this.setState('idle');
    reject?.(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CANCELED));
  }

  private async handleSocketOpen(): Promise<void> {
    try {
      const audioContext = new AudioContext();
      this.audioContext = audioContext;
      if (audioContext.sampleRate < IFLYTEK_AUDIO_CONFIG.sampleRate) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SPEECH_SAMPLE_RATE_UNSUPPORTED);
      }
      await audioContext.audioWorklet.addModule(this.options.processorModuleUrl);
      if (this.terminated) return;

      const sourceNode = audioContext.createMediaStreamSource(this.options.mediaStream);
      const processorNode = new AudioWorkletNode(audioContext, 'wisepen-pcm-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          targetSampleRate: IFLYTEK_AUDIO_CONFIG.sampleRate,
          frameBytes: IFLYTEK_AUDIO_CONFIG.frameBytes,
        },
      });
      this.sourceNode = sourceNode;
      this.processorNode = processorNode;
      processorNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (this.state === 'listening') this.sendAudioFrame(event.data);
      };
      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);
      await audioContext.resume();
      if (this.terminated) return;

      this.started = true;
      this.setState('listening');
      this.maxDurationTimer = window.setTimeout(
        () => this.stop(),
        IFLYTEK_AUDIO_CONFIG.maxDurationMs
      );
      this.startResolve?.();
      this.startResolve = null;
      this.startReject = null;
    } catch (error) {
      this.fail(
        isWisePenError(error)
          ? error
          : createClientError(FRONTEND_CLIENT_ERROR.SPEECH_START_FAILED, undefined, error)
      );
    }
  }

  private handleSocketMessage(event: MessageEvent): void {
    try {
      const payload: unknown = JSON.parse(String(event.data));
      if (!isRecord(payload)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SPEECH_RESPONSE_INVALID);
      }

      const providerError = readProviderError(payload);
      if (providerError) throw providerError;

      if (!isRecord(payload.data)) return;
      if (payload.data.result !== undefined) {
        this.options.onText(this.assembler.append(payload.data.result));
      }
      if (payload.data.status === 2) this.finishNormally();
    } catch (error) {
      this.fail(
        isWisePenError(error)
          ? error
          : createClientError(FRONTEND_CLIENT_ERROR.SPEECH_RESPONSE_INVALID, undefined, error)
      );
    }
  }

  private sendAudioFrame(buffer: ArrayBuffer): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.fail(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CONNECTION_UNAVAILABLE));
      return;
    }
    const status = this.sentFirstFrame ? 1 : 0;
    const frame = this.buildFrame(status, encodeBase64(buffer));
    socket.send(JSON.stringify(frame));
    this.sentFirstFrame = true;
  }

  private sendEndFrame(): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.fail(createClientError(FRONTEND_CLIENT_ERROR.SPEECH_CONNECTION_UNAVAILABLE));
      return;
    }

    if (!this.sentFirstFrame) {
      socket.send(JSON.stringify(this.buildFrame(0, '')));
      this.sentFirstFrame = true;
    }
    socket.send(JSON.stringify(this.buildFrame(2, '')));
  }

  private buildFrame(status: 0 | 1 | 2, audio: string): UnknownRecord {
    const { appId, eosMs } = this.options.credential;
    const data = {
      status,
      format: IFLYTEK_AUDIO_CONFIG.format,
      encoding: IFLYTEK_AUDIO_CONFIG.encoding,
      audio,
    };

    if (status !== 0) return { data };
    return {
      common: { app_id: appId },
      business: {
        ...IFLYTEK_BUSINESS_CONFIG,
        eos: eosMs,
      },
      data,
    };
  }

  private finishNormally(): void {
    if (this.terminated) return;
    const text = this.assembler.getText();
    this.releaseAll();
    this.setState('idle');
    this.options.onFinish?.(text);
  }

  private fail(error: Error): void {
    if (this.terminated) return;
    const notifyError = this.started;
    const reject = this.startReject;
    this.releaseAll();
    this.setState('idle');
    reject?.(error);
    if (notifyError) this.options.onError?.(error);
  }

  private setState(state: XfyunSpeechRecognizerState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private releaseAudioCapture(): void {
    if (this.maxDurationTimer !== null) {
      window.clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
    if (this.processorNode) {
      this.processorNode.port.onmessage = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    for (const track of this.options.mediaStream.getTracks()) track.stop();
  }

  private releaseAll(): void {
    this.terminated = true;
    this.releaseAudioCapture();
    if (this.finishTimer !== null) {
      window.clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    if (this.ownsActiveSlot) {
      recognitionActive = false;
      this.ownsActiveSlot = false;
    }
    this.startResolve = null;
    this.startReject = null;
  }
}
