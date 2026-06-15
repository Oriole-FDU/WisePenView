import { useChatService } from '@/domains';
import {
  buildCapabilityPickerSections,
  type CapabilityPickerItem,
  type CapabilityToolOption,
} from '@/domains/Chat/mapper/capabilityPicker.mapper';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { useChatCapabilityStore, useChatPageStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { base64ToFile, fileToBase64, generateThumbnail } from '@/utils/file/upload';
import { TextArea, toast } from '@heroui/react';
import { useRequest, useUpdateEffect } from 'ahooks';
import { X } from 'lucide-react';
import { type ClipboardEvent, type DragEvent, type KeyboardEvent, useRef, useState } from 'react';
import ActionToolbar from './ActionToolbar';
import CapabilityPicker from './CapabilityPicker';
import ContentPicker from './ContentPicker';
import ContextTags from './ContextTags';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import OtherSkillModal from './OtherSkillModal';
import type { ChatInputProps, PendingImagePayload } from './index.type';
import styles from './style.module.less';

const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_RAW_BYTES_APPROX = Math.floor(MAX_IMAGE_BASE64_BYTES * 0.75);
const MAX_IMAGE_COUNT = 10;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

function ChatInput({
  onSend,
  sending,
  currentModelId,
  onModelChange,
  hasSelectedContext,
  selectedContextText,
  onClearSelectedContext,
  selectedAgent,
  primarySkills,
  advancedMode,
  advancedSkillGroups,
  currentModelVision,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [capabilityOpen, setCapabilityOpen] = useState(false);
  const [contentPickOpen, setContentPickOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [otherSkillModalOpen, setOtherSkillModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const suppressCapabilityCloseRef = useRef(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base64MapRef = useRef<Map<string, string>>(new Map());
  const selectedSkills = useChatCapabilityStore((state) => state.selectedSkills);
  const selectedTools = useChatCapabilityStore((state) => state.selectedTools);
  const toggleSkill = useChatCapabilityStore((state) => state.toggleSkill);
  const removeSkill = useChatCapabilityStore((state) => state.removeSkill);
  const toggleTool = useChatCapabilityStore((state) => state.toggleTool);
  const clearCapabilities = useChatCapabilityStore((state) => state.clearCapabilities);
  const chatService = useChatService();

  const pendingImageMetas = useChatPageStore((state) => state.pendingImageMetas);
  const autoSaveToLibrary = useChatPageStore((state) => state.autoSaveToLibrary);
  const addPendingImage = useChatPageStore((state) => state.addPendingImage);
  const removePendingImage = useChatPageStore((state) => state.removePendingImage);
  const addAttachment = useChatPageStore((state) => state.addAttachment);
  const addPendingAttachmentUpload = useChatPageStore((state) => state.addPendingAttachmentUpload);
  const updatePendingAttachmentUpload = useChatPageStore(
    (state) => state.updatePendingAttachmentUpload
  );
  const removePendingAttachmentUpload = useChatPageStore(
    (state) => state.removePendingAttachmentUpload
  );

  useUpdateEffect(() => {
    const validIds = new Set(pendingImageMetas.map((m) => m.id));
    for (const key of base64MapRef.current.keys()) {
      if (!validIds.has(key)) {
        base64MapRef.current.delete(key);
      }
    }
  }, [pendingImageMetas]);

  const selectedPreviewChars = Array.from(selectedContextText);
  const selectedPreview =
    selectedPreviewChars.length <= 10
      ? selectedContextText
      : `${selectedPreviewChars.slice(0, 5).join('')}...${selectedPreviewChars.slice(-5).join('')}`;

  const { data: toolOptionsData } = useRequest(() => chatService.getTools(), { refreshDeps: [] });
  const toolOptions: CapabilityToolOption[] = toolOptionsData ?? [];

  const otherSkillGroups = (() => {
    const primaryIds = new Set(primarySkills.map((s) => s.skillId));
    return advancedSkillGroups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((s) => !primaryIds.has(s.skillId)),
      }))
      .filter((group) => group.skills.length > 0);
  })();

  const capabilitySections = buildCapabilityPickerSections({
    primarySkills,
    selectedSkills,
    selectedTools,
    toolOptions,
    advancedMode,
    otherSkillGroups,
  });

  function togglePrimarySkill(skill: SkillSummary): void {
    toggleSkill(skill, { sourceAgent: selectedAgent });
  }

  function handleOtherSkillConfirm(
    selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>
  ): void {
    const selectedIds = new Set(selected.map((s) => s.skill.skillId));
    const toRemove = selectedSkills.filter((s) => s.external && !selectedIds.has(s.skillId));
    toRemove.forEach((s) => removeSkill(s.skillId));

    const existingIds = new Set(selectedSkills.map((s) => s.skillId));
    selected.forEach(({ skill, sourceAgent }) => {
      if (!existingIds.has(skill.skillId)) {
        toggleSkill(skill, { sourceAgent, external: true });
      }
    });
  }

  async function uploadAndAddAttachment(file: File) {
    const id = crypto.randomUUID();
    addPendingAttachmentUpload({
      id,
      filename: file.name,
      status: 'uploading',
    });
    try {
      const result = await chatService.uploadAttachment({
        file,
        saveToLibrary: autoSaveToLibrary,
      });
      removePendingAttachmentUpload(id);
      addAttachment({
        attachmentId: result.attachmentId,
        filename: result.filename ?? file.name,
        enabled: true,
      });
      return result;
    } catch (err) {
      updatePendingAttachmentUpload(id, { status: 'failed' });
      toast.danger(`附件上传失败: ${parseErrorMessage(err)}`);
      return null;
    }
  }

  async function addPendingVisionImage(file: File): Promise<void> {
    try {
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(`${file.name} 过大，图片直传约限制原图 3.75MB`);
        return;
      }
      const { mimeType, base64 } = await fileToBase64(file);
      const id = crypto.randomUUID();
      const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
      base64MapRef.current.set(id, base64);
      addPendingImage({
        id,
        filename: file.name,
        mimeType,
        thumbnailUrl,
      });
    } catch (err) {
      toast.danger(`图片添加失败: ${parseErrorMessage(err)}`);
    }
  }

  async function routeFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    let acceptedImageCount = pendingImageMetas.length;
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isImage = IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/');
      if (isImage) {
        if (!currentModelVision) {
          toast.warning('当前模型不支持图片');
          continue;
        }
        if (acceptedImageCount >= MAX_IMAGE_COUNT) {
          toast.warning(`最多 ${MAX_IMAGE_COUNT} 张图片`);
          continue;
        }
        if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
          toast.warning(`${file.name} 过大，图片直传约限制原图 3.75MB`);
          continue;
        }
        acceptedImageCount += 1;
        await addPendingVisionImage(file);
      } else {
        void uploadAndAddAttachment(file);
      }
    }
  }

  async function convertPendingImagesToAttachments(): Promise<void> {
    const metas = useChatPageStore.getState().pendingImageMetas;
    if (metas.length === 0) return;
    for (const meta of metas) {
      const base64 = base64MapRef.current.get(meta.id);
      if (!base64) continue;
      const file = base64ToFile(base64, meta.mimeType, meta.filename);
      const uploaded = await uploadAndAddAttachment(file);
      if (uploaded) {
        removePendingImage(meta.id);
        base64MapRef.current.delete(meta.id);
      }
    }
  }

  function handleModelChange(model: Parameters<typeof onModelChange>[0]): void {
    const wasVision = currentModelVision;
    onModelChange(model);
    if (wasVision && !model.vision) {
      void convertPendingImagesToAttachments();
    }
  }

  const handleSend = async () => {
    if (!value.trim() || sending || !currentModelId) return;
    const uploading = useChatPageStore
      .getState()
      .pendingAttachmentUploads.some((u) => u.status === 'uploading');
    if (uploading) {
      toast.warning('附件仍在上传中，请稍后再发送');
      return;
    }
    let pendingImages: PendingImagePayload[] | undefined;
    if (currentModelVision && pendingImageMetas.length > 0) {
      pendingImages = [];
      for (const meta of pendingImageMetas) {
        const base64 = base64MapRef.current.get(meta.id);
        if (base64) {
          pendingImages.push({ mimeType: meta.mimeType, base64, filename: meta.filename });
        }
      }
    }
    try {
      await onSend(
        value.trim(),
        pendingImages && pendingImages.length > 0 ? { pendingImages } : undefined
      );
      setValue('');
      clearCapabilities();
      const sentIds = new Set(pendingImageMetas.map((m) => m.id));
      for (const id of sentIds) {
        removePendingImage(id);
        base64MapRef.current.delete(id);
      }
    } catch (err) {
      toast.danger(`发送失败: ${parseErrorMessage(err)}`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCapabilityItemPress = (item: CapabilityPickerItem) => {
    switch (item.kind) {
      case 'primary-skill':
        if (item.skill) togglePrimarySkill(item.skill);
        break;
      case 'tool':
        if (item.tool) toggleTool(item.tool);
        break;
      case 'external-skill':
        removeSkill(item.key);
        break;
      case 'select-other':
        setCapabilityOpen(false);
        setOtherSkillModalOpen(true);
        break;
    }
  };

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

  useUpdateEffect(() => {
    clearCapabilities();
  }, [advancedMode, clearCapabilities, selectedAgent?.agentId]);

  const capabilityDropdownContent = (
    <CapabilityPicker
      open
      sections={capabilitySections}
      onItemPress={handleCapabilityItemPress}
      onMenuInteract={() => {
        suppressCapabilityCloseRef.current = true;
      }}
    />
  );

  const contentPickDropdownContent = (
    <ContentPicker
      open
      onClose={() => setContentPickOpen(false)}
      onSelectUpload={() => {
        setContentPickOpen(false);
        fileInputRef.current?.click();
      }}
      onSelectLibrary={() => {
        setContentPickOpen(false);
        setDocPickerOpen(true);
      }}
    />
  );

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) setIsDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsDragOver(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className={styles.inputCard} ref={inputCardRef}>
        <DropOverlay visible={isDragOver} />

        {hasSelectedContext ? (
          <div className={styles.selectedHint}>
            <button
              type="button"
              className={styles.clearSelectedHintBtn}
              onClick={onClearSelectedContext}
              aria-label="清除已选内容"
            >
              <X size={12} />
            </button>
            <span className={styles.selectedHintText} title={selectedContextText}>
              选中内容："{selectedPreview}"
            </span>
          </div>
        ) : null}

        <ContextTags />

        <div>
          <TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="输入消息..."
            rows={1}
            className={styles.textarea}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onPaste={handlePaste}
          />
        </div>

        <div className={styles.actionArea}>
          <ActionToolbar
            modelValue={currentModelId}
            onModelChange={handleModelChange}
            onSend={() => void handleSend()}
            disabledSend={!value.trim() || sending || !currentModelId}
            capabilityCount={selectedSkills.length + selectedTools.length}
            capabilityOpen={capabilityOpen}
            onCapabilityOpenChange={(open: boolean) => {
              if (!open && suppressCapabilityCloseRef.current) {
                suppressCapabilityCloseRef.current = false;
                return;
              }
              if (open) setContentPickOpen(false);
              setCapabilityOpen(open);
            }}
            capabilityDropdownContent={capabilityDropdownContent}
            contentPickOpen={contentPickOpen}
            onContentPickOpenChange={(open: boolean) => {
              if (open) setCapabilityOpen(false);
              setContentPickOpen(open);
            }}
            contentPickDropdownContent={contentPickDropdownContent}
          />
        </div>
      </div>

      <OtherSkillModal
        open={otherSkillModalOpen}
        groups={otherSkillGroups}
        currentAgent={selectedAgent}
        selectedSkills={selectedSkills}
        onClose={() => setOtherSkillModalOpen(false)}
        onConfirm={handleOtherSkillConfirm}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void routeFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <DocumentPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} />

      <div className={styles.footerTip}>AI 内容仅供参考，请仔细甄别</div>
    </div>
  );
}

export default ChatInput;
