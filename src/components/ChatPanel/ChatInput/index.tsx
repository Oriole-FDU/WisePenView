import type { SkillSummary } from '@/domains';
import { useChatService } from '@/domains';
import type { ChatAgentOption, TemporarySkillSelection } from '@/store';
import { useChatCapabilityStore } from '@/store';
import { useRequest, useUpdateEffect } from 'ahooks';
import { Input } from 'antd';
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import ActionToolbar from './ActionToolbar';
import CapabilityPicker from './CapabilityPicker';
import ContentPicker from './ContentPicker';
import ContextTags from './ContextTags';
import DocumentPickerModal from './DocumentPickerModal';
import OtherSkillModal from './OtherSkillModal';
import { type CapabilityToolOption } from './capability';
import type { ChatInputProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;

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
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [capabilityOpen, setCapabilityOpen] = useState(false);
  const [contentPickOpen, setContentPickOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [otherSkillModalOpen, setOtherSkillModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const suppressCapabilityCloseRef = useRef(false);
  const selectedSkills = useChatCapabilityStore((state) => state.selectedSkills);
  const selectedTools = useChatCapabilityStore((state) => state.selectedTools);
  const toggleSkill = useChatCapabilityStore((state) => state.toggleSkill);
  const removeSkill = useChatCapabilityStore((state) => state.removeSkill);
  const toggleTool = useChatCapabilityStore((state) => state.toggleTool);
  const clearCapabilities = useChatCapabilityStore((state) => state.clearCapabilities);
  const chatService = useChatService();

  const selectedPreviewChars = Array.from(selectedContextText);
  const selectedPreview =
    selectedPreviewChars.length <= 10
      ? selectedContextText
      : `${selectedPreviewChars.slice(0, 5).join('')}...${selectedPreviewChars.slice(-5).join('')}`;

  const { data: toolOptionsData } = useRequest(() => chatService.getTools(), { refreshDeps: [] });
  const toolOptions = useMemo<CapabilityToolOption[]>(
    () => toolOptionsData ?? [],
    [toolOptionsData]
  );

  const otherSkillGroups = useMemo(
    () =>
      advancedSkillGroups.filter((group) =>
        group.key === 'personal'
          ? selectedAgent?.agentType !== 'PERSONAL'
          : group.key !== `group-${selectedAgent?.groupId ?? ''}`
      ),
    [advancedSkillGroups, selectedAgent]
  );

  const togglePrimarySkill = useCallback(
    (skill: SkillSummary) => {
      toggleSkill(skill, { sourceAgent: selectedAgent });
    },
    [selectedAgent, toggleSkill]
  );

  const handleOtherSkillConfirm = useCallback(
    (selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>) => {
      const selectedIds = new Set(selected.map((s) => s.skill.skillId));
      // Remove external skills that are no longer selected
      const toRemove = selectedSkills.filter((s) => s.external && !selectedIds.has(s.skillId));
      toRemove.forEach((s) => removeSkill(s.skillId));
      // Add new skills that aren't already selected
      const existingIds = new Set(selectedSkills.map((s) => s.skillId));
      selected.forEach(({ skill, sourceAgent }) => {
        if (!existingIds.has(skill.skillId)) {
          toggleSkill(skill, { sourceAgent });
        }
      });
    },
    [selectedSkills, removeSkill, toggleSkill]
  );

  const handleSend = async () => {
    if (!value.trim() || sending || !currentModelId) return;
    await onSend(value.trim());
    setValue('');
    clearCapabilities();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (nextValue: string) => {
    setValue(nextValue);
  };

  const handleCapabilityOpenChange = useCallback((open: boolean) => {
    if (!open && suppressCapabilityCloseRef.current) {
      suppressCapabilityCloseRef.current = false;
      return;
    }
    if (open) setContentPickOpen(false);
    setCapabilityOpen(open);
  }, []);

  const handleContentPickOpenChange = useCallback((open: boolean) => {
    if (open) setCapabilityOpen(false);
    setContentPickOpen(open);
  }, []);

  useUpdateEffect(() => {
    clearCapabilities();
  }, [advancedMode, clearCapabilities, selectedAgent?.agentId]);

  const normalizedSelectedSkills = useMemo<TemporarySkillSelection[]>(
    () => selectedSkills,
    [selectedSkills]
  );

  const capabilityDropdownContent = (
    <CapabilityPicker
      open
      advancedMode={advancedMode}
      primarySkills={primarySkills}
      selectedSkills={normalizedSelectedSkills}
      selectedTools={selectedTools}
      toolOptions={toolOptions}
      onToggleSkill={togglePrimarySkill}
      onToggleTool={toggleTool}
      onRemoveExternalSkill={removeSkill}
      onOpenOtherSkillModal={() => {
        setCapabilityOpen(false);
        setOtherSkillModalOpen(true);
      }}
      currentAgent={selectedAgent}
      otherSkillGroups={otherSkillGroups}
      onMenuInteract={() => {
        suppressCapabilityCloseRef.current = true;
      }}
    />
  );

  const contentPickDropdownContent = (
    <ContentPicker
      open
      onClose={() => setContentPickOpen(false)}
      onSelectUpload={() => setContentPickOpen(false)}
      onSelectLibrary={() => {
        setContentPickOpen(false);
        setDocPickerOpen(true);
      }}
    />
  );

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputCard} ref={inputCardRef}>
        {hasSelectedContext ? (
          <div className={styles.selectedHint}>
            <button
              type="button"
              className={styles.clearSelectedHintBtn}
              onClick={onClearSelectedContext}
              aria-label="清除已选内容"
            >
              <LuX size={12} />
            </button>
            <span className={styles.selectedHintText} title={selectedContextText}>
              选中内容：“{selectedPreview}”
            </span>
          </div>
        ) : null}

        <ContextTags />

        <div className={styles.textareaWrap}>
          <TextArea
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="输入消息..."
            autoSize={{ minRows: 1, maxRows: 8 }}
            className={styles.textarea}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
        </div>

        <div className={styles.actionArea}>
          <ActionToolbar
            modelValue={currentModelId}
            onModelChange={onModelChange}
            onSend={() => void handleSend()}
            disabledSend={!value.trim() || sending || !currentModelId}
            capabilityCount={selectedSkills.length + selectedTools.length}
            capabilityOpen={capabilityOpen}
            onCapabilityOpenChange={handleCapabilityOpenChange}
            capabilityDropdownContent={capabilityDropdownContent}
            contentPickOpen={contentPickOpen}
            onContentPickOpenChange={handleContentPickOpenChange}
            contentPickDropdownContent={contentPickDropdownContent}
            getPopupContainer={() => inputCardRef.current || document.body}
          />
        </div>
      </div>

      <OtherSkillModal
        open={otherSkillModalOpen}
        groups={otherSkillGroups}
        currentAgent={selectedAgent}
        selectedSkills={normalizedSelectedSkills}
        onClose={() => setOtherSkillModalOpen(false)}
        onConfirm={handleOtherSkillConfirm}
      />

      <DocumentPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} />

      <div className={styles.footerTip}>AI 内容仅供参考，请仔细甄别</div>
    </div>
  );
}

export default ChatInput;
