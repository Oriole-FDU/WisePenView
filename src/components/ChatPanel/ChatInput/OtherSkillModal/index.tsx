import type { SkillSummary } from '@/domains';
import type { ChatAgentOption } from '@/store';
import type { TreeDataNode } from 'antd';
import { Button, Modal, Tree } from 'antd';
import type { Key } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { AiOutlineFolder } from 'react-icons/ai';
import { LuChevronDown } from 'react-icons/lu';
import { buildAgentFromSkillTreeGroup } from '../../agent';
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

  const visibleGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.key === 'personal'
          ? currentAgent?.agentType !== 'PERSONAL'
          : group.key !== `group-${currentAgent?.groupId ?? ''}`
      ),
    [currentAgent, groups]
  );

  const { skillMap, treeData } = useMemo(() => {
    const mapping = new Map<string, { skill: SkillSummary; sourceAgent: ChatAgentOption | null }>();
    const data: TreeDataNode[] = visibleGroups.map((group) => {
      const sourceAgent = buildAgentFromSkillTreeGroup(group, currentAgent);
      return {
        key: group.key,
        title: (
          <span className={styles.nodeTitle}>
            <AiOutlineFolder size={14} color="var(--ant-color-warning)" />
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
  }, [currentAgent, visibleGroups]);

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        setSelectedKeys(selectedSkills.filter((s) => s.external).map((s) => s.skillId));
      }
    },
    [selectedSkills]
  );

  const handleSelect = useCallback((keys: Key[]) => {
    setSelectedKeys(keys);
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    const selected = selectedKeys.map((key) => skillMap.get(String(key))).filter(Boolean) as Array<{
      skill: SkillSummary;
      sourceAgent: ChatAgentOption | null;
    }>;
    onConfirm(selected);
    onClose();
  }, [selectedKeys, skillMap, onConfirm, onClose]);

  return (
    <Modal
      title="选择其他 Skill"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      width={560}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确认
        </Button>,
      ]}
    >
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
                <LuChevronDown size={14} />
              </span>
            }
            onSelect={handleSelect}
          />
        </div>
      </div>
    </Modal>
  );
}

export default OtherSkillModal;
