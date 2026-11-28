import { useUnmount } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSpeechService } from '@/domains';
import { resolveXfyunSpeechLanguage, XfyunSpeechRecognizer } from '@/domains/Speech';
import { useApi } from '@/hooks/useApi';
import { createError, FRONTEND_CLIENT_ERROR, isWisePenError, reportError } from '@/utils/error';

import { useChatInputStoreApi } from '../_context';
import type { VoiceInputProps, VoiceInputState } from './index.type';
import pcmProcessorModuleUrl from './pcmProcessor.worklet.ts?worker&url';

interface UseVoiceInputOptions {
  disabled: boolean;
}

const DEFAULT_EOS_MS = 2500;

function mergeInputValue(originalValue: string, transcript: string): string {
  if (!transcript) return originalValue;
  if (!originalValue) return transcript;
  return `${originalValue}${/\s$/.test(originalValue) ? '' : ' '}${transcript}`;
}

function stopStream(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

function mapMicrophoneError(error: unknown): Error {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return createError({
        code: FRONTEND_CLIENT_ERROR.MICROPHONE_PERMISSION_DENIED,
        source: 'client',
        cause: error,
      });
    }
    if (error.name === 'NotFoundError') {
      return createError({
        code: FRONTEND_CLIENT_ERROR.MICROPHONE_NOT_FOUND,
        source: 'client',
        cause: error,
      });
    }
    if (error.name === 'NotReadableError') {
      return createError({
        code: FRONTEND_CLIENT_ERROR.MICROPHONE_BUSY,
        source: 'client',
        cause: error,
      });
    }
  }
  return isWisePenError(error)
    ? error
    : createError({
        code: FRONTEND_CLIENT_ERROR.VOICE_INPUT_START_FAILED,
        source: 'client',
        cause: error,
      });
}

export function useVoiceInput({ disabled }: UseVoiceInputOptions): VoiceInputProps {
  const speechService = useSpeechService();
  const { i18n } = useTranslation();
  const store = useChatInputStoreApi();
  const [state, setState] = useState<VoiceInputState>('idle');
  const originalValueRef = useRef('');
  const operationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<XfyunSpeechRecognizer | null>(null);
  const { runAsync: issueCredential } = useApi(
    () => speechService.issueRecognitionCredential({ eosMs: DEFAULT_EOS_MS }),
    { manual: true }
  );

  async function startRecognition(): Promise<void> {
    const operation = ++operationRef.current;
    originalValueRef.current = store.getState().value;
    setState('requestingPermission');

    let mediaStream: MediaStream | null = null;
    let recognizer: XfyunSpeechRecognizer | null = null;

    try {
      if (!globalThis.isSecureContext) {
        throw createError({
          code: FRONTEND_CLIENT_ERROR.VOICE_INPUT_HTTPS_REQUIRED,
          source: 'client',
        });
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw createError({
          code: FRONTEND_CLIENT_ERROR.VOICE_INPUT_UNSUPPORTED,
          source: 'client',
        });
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (operation !== operationRef.current) {
        stopStream(mediaStream);
        return;
      }
      streamRef.current = mediaStream;

      setState('issuingCredential');
      const credential = await issueCredential();
      if (operation !== operationRef.current) {
        stopStream(mediaStream);
        return;
      }

      setState('connecting');
      recognizer = new XfyunSpeechRecognizer({
        credential,
        mediaStream,
        processorModuleUrl: pcmProcessorModuleUrl,
        language: resolveXfyunSpeechLanguage(i18n.resolvedLanguage),
        onText: (transcript) => {
          if (recognizerRef.current !== recognizer) return;
          store.getState().setValue(mergeInputValue(originalValueRef.current, transcript));
        },
        onStateChange: (nextState) => {
          if (recognizerRef.current !== recognizer) return;
          if (nextState === 'listening' || nextState === 'finishing') setState(nextState);
        },
        onFinish: () => {
          if (recognizerRef.current !== recognizer) return;
          recognizerRef.current = null;
          streamRef.current = null;
          originalValueRef.current = '';
          setState('idle');
        },
        onError: (error) => {
          if (recognizerRef.current !== recognizer) return;
          store.getState().setValue(originalValueRef.current);
          recognizerRef.current = null;
          streamRef.current = null;
          originalValueRef.current = '';
          setState('idle');
          const reportedError = createError(error);
          reportError(reportedError);
        },
      });
      recognizerRef.current = recognizer;
      await recognizer.start();
    } catch (error) {
      recognizer?.cancel();
      stopStream(mediaStream);
      if (operation !== operationRef.current) return;

      recognizerRef.current = null;
      streamRef.current = null;
      store.getState().setValue(originalValueRef.current);
      originalValueRef.current = '';
      setState('idle');
      const reportedError = createError(mapMicrophoneError(error));
      reportError(reportedError);
    }
  }

  function handlePress(): void {
    if (disabled) return;
    if (state === 'idle') {
      void startRecognition();
      return;
    }
    if (state === 'listening') recognizerRef.current?.stop();
  }

  useUnmount(() => {
    operationRef.current += 1;
    recognizerRef.current?.cancel();
    stopStream(streamRef.current);
  });

  return {
    state,
    isActive: state !== 'idle',
    isDisabled: disabled || (state !== 'idle' && state !== 'listening'),
    onPress: handlePress,
  };
}
