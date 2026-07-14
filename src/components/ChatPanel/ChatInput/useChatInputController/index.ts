import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import {
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  onStop?: ChatInputProps['onStop'];
  sending: boolean;
}

export function useChatInputController({ onSend, onStop, sending }: UseChatInputControllerOptions) {
  const store = useChatInputStoreApi();
  const dragCounterRef = useRef(0);
  const { routeFiles, preparePendingAttachments, clearPendingFileCache } = useChatInputFiles();
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

  const sendDisabled = !value.trim() || !selectedModel || voiceInputProps.isActive;

  async function handleSend(): Promise<void> {
    const text = completionState.value.trim();
    if (!text || sending || !selectedModel) return;
    if (pendingAttachmentUploads.some((upload) => upload.status === 'uploading')) {
      toast.warning('附件仍在上传中，请稍后再发送');
      return;
    }

    try {
      const pendingAttachments = await preparePendingAttachments();
      if (!pendingAttachments) return;
      await onSend(text, {
        model: selectedModel,
        activeDocRefs: completionState.activeDocRefs,
        activeAttachments: [...completionState.activeAttachments, ...pendingAttachments],
        selectedSkills: completionState.selectedSkills,
        selectedTools: completionState.selectedTools,
      });
      clearAfterSend();
      clearPendingFileCache();
    } catch (err) {
      toast.danger(`发送失败: ${parseErrorMessage(err)}`);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
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
      void routeFiles(e.dataTransfer.files);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>): void {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
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
    dropOverlayProps: {
      visible: isDragOver,
    },
    attachmentStripProps: {},
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
      sendDisabled,
      sending,
      voiceInputProps,
      onSend: () => void handleSend(),
      onStop,
    },
  };
}
