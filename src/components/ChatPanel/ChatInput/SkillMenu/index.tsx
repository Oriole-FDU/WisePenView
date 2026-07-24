import AppIconButton from '@/components/Button/AppIconButton';
import { Popover } from '@/components/Overlay';
import { useChatService } from '@/domains';
import { buildSkillMenuSections } from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { ListBox, ListBoxItem, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, Settings, Sparkles, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

function SkillMenu() {
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const { selectedAgent, selectedSkills, selectedTools, skillMenuOpen } = useChatInputStore(
    useShallow((state) => ({
      selectedAgent: state.selectedAgent,
      selectedSkills: state.selectedSkills,
      selectedTools: state.selectedTools,
      skillMenuOpen: state.skillMenuOpen,
    }))
  );
  const { removeSkill, setOtherSkillModalOpen, setSkillMenuOpen, toggleSkill, toggleTool } =
    store.getState();
  const { data: skillMenuOptions } = useRequest(
    () => chatService.getChatInputCapabilityOptions({ agent: selectedAgent }),
    {
      refreshDeps: [selectedAgent.agentId],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const sections = useMemo(
    () =>
      buildSkillMenuSections({
        primarySkills: skillMenuOptions?.primarySkills ?? [],
        selectedSkills,
        selectedTools,
        toolOptions: skillMenuOptions?.tools ?? [],
        advancedMode: true,
        otherSkillGroups: skillMenuOptions?.otherSkillGroups ?? [],
      }),
    [selectedSkills, selectedTools, skillMenuOptions]
  );
  const primarySection = sections.find((section) => section.key === 'primary-skills');
  const externalSection = sections.find((section) => section.key === 'external-skills');
  const toolSection = sections.find((section) => section.key === 'tools');
  const selectedSkillIds = selectedSkills.map((skill) => skill.skillId);
  const selectedToolIds = selectedTools.map((tool) => tool.toolId);
  const externalItems =
    externalSection?.items.filter((item) => item.kind === 'external-skill') ?? [];
  const selectedOptionCount = selectedSkills.length + selectedTools.length;

  function handleToggleSkill(skillId: string): void {
    const skill = skillMenuOptions?.primarySkills.find((item) => item.skillId === skillId);
    if (!skill) return;
    toggleSkill(skill, selectedAgent);
  }

  function handleToggleTool(toolId: string): void {
    const tool = skillMenuOptions?.tools.find((item) => item.toolId === toolId);
    if (!tool) return;
    toggleTool(tool);
  }

  function handleSelectOther(): void {
    setSkillMenuOpen(false);
    setOtherSkillModalOpen(true);
  }

  return (
    <Popover isOpen={skillMenuOpen} onOpenChange={setSkillMenuOpen}>
      <span className={styles.toolButtonWrap}>
        {selectedOptionCount > 0 ? (
          <span className={styles.skillMenuBadge}>{selectedOptionCount}</span>
        ) : null}
        <AppIconButton
          icon={<Settings size={17} aria-hidden="true" />}
          label="配置 Agent"
          overlayTrigger={<Popover.Trigger />}
        />
      </span>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <Popover.DeferredContent
            fallback={
              <div className={`${styles.deferredPopoverPanel} ${styles.deferredSkillMenuPanel}`} />
            }
          >
            {() => (
              <div className={`${styles.popoverPanel} ${styles.popoverPanelScrollable}`}>
                <div className={styles.popoverTitle}>Skill</div>

                {primarySection && primarySection.items.length > 0 ? (
                  <ListBox
                    aria-label="选择 Skill"
                    selectionMode="multiple"
                    selectedKeys={selectedSkillIds}
                    className={styles.listBox}
                  >
                    {primarySection.items.map((item) => (
                      <ListBoxItem
                        key={item.key}
                        id={item.key}
                        textValue={item.label}
                        onPress={() => handleToggleSkill(item.key)}
                      >
                        <span className={styles.listItemContent}>
                          <Sparkles size={16} />
                          <span>{item.label}</span>
                          {selectedSkillIds.includes(item.key) ? (
                            <Check size={14} className={styles.checkIcon} />
                          ) : null}
                        </span>
                      </ListBoxItem>
                    ))}
                  </ListBox>
                ) : null}

                {externalItems.length > 0 ? (
                  <>
                    <div className={styles.popoverTitle}>其他 Skill</div>
                    <ListBox
                      aria-label="已选择的其他 Skill"
                      selectionMode="multiple"
                      selectedKeys={externalItems.map((item) => item.key)}
                      className={styles.listBox}
                    >
                      {externalItems.map((item) => (
                        <ListBoxItem
                          key={item.key}
                          id={item.key}
                          textValue={item.label}
                          onPress={() => removeSkill(item.key)}
                        >
                          <span className={styles.listItemContent}>
                            <Sparkles size={16} />
                            <span>
                              {item.label}
                              {item.sourceText ? (
                                <span className={styles.skillMenuSourceText}>
                                  {item.sourceText}
                                </span>
                              ) : null}
                            </span>
                            <Check size={14} className={styles.checkIcon} />
                          </span>
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </>
                ) : null}

                <ListBox
                  aria-label="选择其他 Skill"
                  selectionMode="none"
                  className={styles.listBox}
                  onAction={handleSelectOther}
                >
                  <ListBoxItem id="select-other-skill" textValue="选择其他 Skill...">
                    <span className={styles.listItemContent}>
                      <Sparkles size={16} />
                      <span>选择其他 Skill...</span>
                    </span>
                  </ListBoxItem>
                </ListBox>

                {toolSection && toolSection.items.length > 0 ? (
                  <>
                    <div className={styles.popoverTitle}>工具</div>
                    <ListBox
                      aria-label="选择工具"
                      selectionMode="multiple"
                      selectedKeys={selectedToolIds}
                      className={styles.listBox}
                    >
                      {toolSection.items.map((item) => (
                        <ListBoxItem
                          key={item.key}
                          id={item.key}
                          textValue={item.label}
                          onPress={() => handleToggleTool(item.key)}
                        >
                          <span className={styles.listItemContent}>
                            <Wrench size={16} />
                            <span>{item.label}</span>
                            {selectedToolIds.includes(item.key) ? (
                              <Check size={14} className={styles.checkIcon} />
                            ) : null}
                          </span>
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </>
                ) : null}
              </div>
            )}
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default SkillMenu;
