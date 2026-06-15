import type { TreeDataNode } from '@/components/Common/Tree';
import Tree from '@/components/Common/Tree';
import { buildAgentFromSkillTreeGroup } from '@/domains/Chat/mapper/agent.mapper';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { Button, Modal } from '@heroui/react';
import { ChevronDown, Folder } from 'lucide-react';
import type { Key } from 'react';
import { useMemo, useState } from 'react';
import type { OtherSkillModalProps } from './index.type';
import styles from './style.module.less';

function OtherSkillModal({
  open,
  groups,
  currentAgent,
  selectedSkills,
  onClose,
  onConfirm,
}: OtherSkillModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const { skillMap, treeData } = useMemo(() => {
    const mapping = new Map<string, { skill: SkillSummary; sourceAgent: ChatAgentOption | null }>();
    const data: TreeDataNode[] = groups.map((group) => {
      const sourceAgent = buildAgentFromSkillTreeGroup(group, currentAgent);
      return {
        key: group.key,
        title: (
          <span className={styles.nodeTitle}>
            <Folder size={14} color="var(--warning)" />
            <span>{group.label}</span>
          </span>
        ),
        selectable: false,
        children: group.skills.map((skill) => {
          mapping.set(skill.skillId, { skill, sourceAgent });
          return {
            key: skill.skillId,
            title: skill.displayName,
          };
        }),
      };
    });

    return { skillMap: mapping, treeData: data };
  }, [currentAgent, groups]);

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setSelectedKeys(selectedSkills.filter((s) => s.external).map((s) => s.skillId));
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    const selected = selectedKeys.map((key) => skillMap.get(String(key))).filter(Boolean) as Array<{
      skill: SkillSummary;
      sourceAgent: ChatAgentOption | null;
    }>;
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>选择其他 Skill</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.wrapper}>
                <div className={styles.hint}>选择要添加的 Skill（可多选）</div>
                <div className={styles.treeNav}>
                  <Tree
                    treeData={treeData}
                    className={styles.tree}
                    multiple
                    selectedKeys={selectedKeys}
                    defaultExpandAll
                    blockNode
                    switcherIcon={
                      <span>
                        <ChevronDown size={14} />
                      </span>
                    }
                    onSelect={(keys: Key[]) => setSelectedKeys(keys)}
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                取消
              </Button>
              <Button variant="primary" onPress={handleConfirm}>
                确认
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default OtherSkillModal;
