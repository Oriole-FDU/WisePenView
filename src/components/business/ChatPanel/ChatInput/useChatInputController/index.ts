import { toast } from '@heroui/react';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { useChatService } from '@/domains';
import { mapChatInputToolSelectionOverrides } from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import {
  selectChatInputCompletionState,
  selectChatInputSelectedModel,
  useChatInputStore,
  useChatInputStoreApi,
} from '../_store/ChatInputStore';
import type { ChatInputProps } from '../index.type';
import { useChatInputFiles } from '../useChatInputFiles';
import { useVoiceInput } from '../VoiceInput/useVoiceInput';

interface UseChatInputControllerOptions {
  onSend: ChatInputProps['onSend'];
  onCancel?: ChatInputProps['onCancel'];
  onRequireLogin?: ChatInputProps['onRequireLogin'];
  isAuthenticated: boolean;
  sending: boolean;
}

export function useChatInputController({
  onSend,
  onCancel,
  onRequireLogin,
  isAuthenticated,
  sending,
}: UseChatInputControllerOptions) {
  const { t } = useTranslation('chat');
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const dragCounterRef = useRef(0);
  const { routeFiles } = useChatInputFiles();
  const voiceInputProps = useVoiceInput({ disabled: sending });

  const { isComposing, isDragOver, pendingAttachmentUploads, selectedModel, value } =
    useChatInputStore(
      useShallow((state) => ({
        isComposing: state.isComposing,
        isDragOver: state.isDragOver,
        pendingAttachmentUploads: state.pendingAttachmentUploads,
        selectedModel: selectChatInputSelectedModel(state),
        value: state.value,
      }))
    );
  const completionState = useChatInputStore(useShallow(selectChatInputCompletionState));
  const { clearAfterSend, setIsComposing, setIsDragOver, setValue } = store.getState();
  const selectedAgentId = completionState.selectedAgent.agentId;
  const selectedAgentVersion = completionState.selectedAgent.agentVersion ?? null;
  const capabilityRequest = useApi(
    async () => ({
      agent: completionState.selectedAgent,
      options: await chatService.getChatInputCapabilityOptions({
        agent: completionState.selectedAgent,
      }),
    }),
    {
      ready: isAuthenticated,
      refreshDeps: [selectedAgentId, selectedAgentVersion],
    }
  );
  const capabilityOptions =
    capabilityRequest.data != null &&
    capabilityRequest.data.agent.agentId === selectedAgentId &&
    (capabilityRequest.data.agent.agentVersion ?? null) === selectedAgentVersion
      ? capabilityRequest.data.options
      : undefined;

  const sendDisabled = isAuthenticated
    ? !value.trim() ||
      !selectedModel ||
      voiceInputProps.isActive ||
      (!capabilityOptions && capabilityRequest.loading)
    : !value.trim() || voiceInputProps.isActive;

  async function handleSend(): Promise<void> {
    const text = completionState.value.trim();
    if (!text || sending) return;
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    if (!selectedModel) return;
    if (!capabilityOptions && capabilityRequest.loading) return;
    if (pendingAttachmentUploads.some((upload) => upload.status === 'uploading')) {
      toast.warning(t('input.attachmentUploading'));
      return;
    }
    if (pendingAttachmentUploads.some((upload) => upload.status === 'failed')) {
      toast.warning(t('input.attachmentUploadFailed'));
      return;
    }

    let resolvedCapabilityOptions = capabilityOptions;
    if (!resolvedCapabilityOptions) {
      try {
        const result = await capabilityRequest.runAsync();
        if (
          result.agent.agentId !== selectedAgentId ||
          (result.agent.agentVersion ?? null) !== selectedAgentVersion
        ) {
          return;
        }
        resolvedCapabilityOptions = result.options;
      } catch {
        return;
      }
    }

    try {
      const latestCompletionState = selectChatInputCompletionState(store.getState());
      const sendAccepted = await onSend(text, {
        model: selectedModel,
        selectedAgent: latestCompletionState.selectedAgent,
        activeDocRefs: latestCompletionState.activeDocRefs,
        activeAttachments: latestCompletionState.activeAttachments,
        selectedSkills: latestCompletionState.selectedSkills,
        toolSelectionOverrides: mapChatInputToolSelectionOverrides(
          resolvedCapabilityOptions.tools,
          latestCompletionState.selectedTools
        ),
      });
      if (sendAccepted === false) return;
      clearAfterSend();
    } catch (err) {
      toast.danger(t('input.sendFailed', { error: parseErrorMessage(err) }));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    const isCompositionEnter = e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !isCompositionEnter) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      if (!isAuthenticated) {
        onRequireLogin?.();
        return;
      }
      void routeFiles(e.dataTransfer.files);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>): void {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        if (!isAuthenticated) {
          onRequireLogin?.();
          return;
        }
        const file = item.getAsFile();
        if (file) void routeFiles([file]);
        return;
      }
    }
  }

  return {
    containerProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    isDragOver,
    textAreaProps: {
      value,
      readOnly: voiceInputProps.isActive,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
      onKeyDown: handleKeyDown,
      onCompositionStart: () => setIsComposing(true),
      onCompositionEnd: () => setIsComposing(false),
      onPaste: handlePaste,
    },
    toolbarProps: {
      capabilityOptions,
      capabilityOptionsLoading: capabilityRequest.loading,
      sendDisabled,
      sending,
      voiceInputProps,
      isAuthenticated,
      onRequireLogin,
      onSend: () => void handleSend(),
      onCancel,
    },
  };
}
