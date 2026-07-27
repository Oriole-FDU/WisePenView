import AppModal from '@/components/Overlay/AppModal';
import type { TreeDataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useChatService } from '@/domains';
import type { ChatAgentOption } from '@/domains/Chat';
import { buildOtherSkillTreeGroups } from '@/domains/Chat';
import type { ResourceSkillSummary } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Folder } from 'lucide-react';
import type { Key } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from './style.module.less';

function OtherSkillModal() {
  const open = useChatInputStore((state) => state.otherSkillModalOpen);
  if (!open) return null;
  return <OtherSkillModalContent />;
}

function OtherSkillModalContent() {
  const { t } = useTranslation(['chat', 'common']);
  const chatService = useChatService();
  const { currentAgent, selectedSkills } = useChatInputStore(
    useShallow((state) => ({
      currentAgent: state.selectedAgent,
      selectedSkills: state.selectedSkills,
    }))
  );
  const { replaceExternalSkills, setOtherSkillModalOpen } = useChatInputStoreApi().getState();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(() =>
    selectedSkills.filter((s) => s.external).map((s) => s.skillId)
  );
  const { data, loading } = useRequest(
    () => chatService.getChatInputCapabilityOptions({ agent: currentAgent }),
    {
      refreshDeps: [currentAgent.agentId],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const rawGroups = data?.otherSkillGroups;

  const { skillMap, treeData } = (() => {
    const mapping = new Map<
      string,
      { skill: ResourceSkillSummary; sourceAgent: ChatAgentOption | null }
    >();
    const groups = buildOtherSkillTreeGroups(rawGroups ?? [], currentAgent);
    const data: TreeDataNode[] = groups.map((group) => {
      const groupLabel =
        group.key === 'personal'
          ? t('input.otherSkillPicker.personal')
          : !group.label
            ? t('input.otherSkillPicker.group')
            : group.label;
      return {
        key: group.key,
        title: (
          <span className={styles.nodeTitle}>
            <Folder size={14} color="var(--warning)" />
            <span>{groupLabel}</span>
          </span>
        ),
        selectable: false,
        children: group.skills.map((skill) => {
          mapping.set(skill.skillId, { skill, sourceAgent: group.sourceAgent });
          return {
            key: skill.skillId,
            title: skill.displayName,
          };
        }),
      };
    });

    return { skillMap: mapping, treeData: data };
  })();

  function handleClose(): void {
    setOtherSkillModalOpen(false);
  }

  const handleOpenChange = (visible: boolean) => {
    if (!visible) handleClose();
  };

  const handleConfirm = () => {
    const selected = selectedKeys.map((key) => skillMap.get(String(key))).filter(Boolean) as Array<{
      skill: ResourceSkillSummary;
      sourceAgent: ChatAgentOption | null;
    }>;
    replaceExternalSkills(selected);
    handleClose();
  };

  return (
    <AppModal
      isOpen
      onOpenChange={handleOpenChange}
      title={t('input.otherSkillPicker.title')}
      size="md"
      contentMode="dialog"
    >
      <AppModal.DeferredContent
        fallback={
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>{t('input.otherSkillPicker.hint')}</div>
              <div className={styles.treeNav} />
            </div>
          </AppModal.Body>
        }
      >
        {() => (
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>{t('input.otherSkillPicker.hint')}</div>
              <div className={styles.treeNav}>
                {loading ? (
                  <div className={styles.hint}>{t('input.otherSkillPicker.loading')}</div>
                ) : (
                  <Tree
                    treeData={treeData}
                    className={styles.tree}
                    multiple
                    selectedKeys={selectedKeys}
                    defaultExpandAll
                    blockNode
                    onSelect={(keys: Key[]) => setSelectedKeys(keys)}
                  />
                )}
              </div>
            </div>
          </AppModal.Body>
        )}
      </AppModal.DeferredContent>
      <AppModal.Footer>
        <Button variant="secondary" onPress={handleClose}>
          {t('actions.cancel', { ns: 'common' })}
        </Button>
        <Button variant="primary" onPress={handleConfirm}>
          {t('actions.confirm', { ns: 'common' })}
        </Button>
      </AppModal.Footer>
    </AppModal>
  );
}

export default OtherSkillModal;
