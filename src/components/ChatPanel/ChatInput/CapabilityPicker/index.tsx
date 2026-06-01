import React, { useMemo } from 'react';
import { Divider, Empty, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { RiToolsLine } from 'react-icons/ri';
import type { CapabilityPickerProps } from './index.type';
import type { CapabilityToolOption } from '../capability';
import CheckIcon from '../CheckIcon';
import chatInputStyles from '../style.module.less';
import popupStyles from '@/components/ChatPanel/popupSurface.module.less';
import styles from './style.module.less';

function CapabilityPicker({
  open,
  advancedMode,
  primarySkills,
  selectedSkills,
  selectedTools,
  toolOptions,
  onToggleSkill,
  onToggleTool,
  onRemoveExternalSkill,
  onOpenOtherSkillModal,
  currentAgent,
  otherSkillGroups,
  onMenuInteract,
}) {
  const selectedSkillKeys = useMemo(() => selectedSkills.map((s) => s.skillId), [selectedSkills]);
  const selectedToolKeys = useMemo(() => selectedTools.map((t) => t.toolId), [selectedTools]);

  const primarySkillItems = useMemo<MenuProps['items']>(
    () =>
      primarySkills.map((skill) {
        const checked = selectedSkillKeys.includes(skill.skillId);
        return {
          key: skill.skillId,
          icon: <RiToolsLine size={16} />,
          label: (
            <span className={`${chatInputStyles.menuItemRow} ${popupStyles.menuLabel}`}>
              <span>{skill.displayName}</span>
              {checked && (
                <span className={chatInputStyles.capabilityCheck}>
                  <CheckIcon />
                </span>
              )}
            </span>
          ),
        };
      }),
    [primarySkills, selectedSkillKeys]
  );

  const toolItems = useMemo<MenuProps['items']>(
    () =>
      toolOptions.map((tool) {
        const checked = selectedToolKeys.includes(tool.toolId);
        return {
          key: tool.toolId,
          icon: <RiToolsLine size={16} />,
          label: (
            <span className={`${chatInputStyles.menuItemRow} ${popupStyles.menuLabel}`}>
              <span>{tool.label}</span>
              {checked && (
                <span className={chatInputStyles.capabilityCheck}>
                  <CheckIcon />
                </span>
              )}
            </span>
          ),
        };
      }),
    [toolOptions, selectedToolKeys]
  );

  const externalSkills = useMemo(() {
    const currentGroupId = currentAgent?.groupId;
    const orderMap = new Map(otherSkillGroups.map((group, index) => [group.key, index]));
    return selectedSkills
      .filter((item) {
        if (currentAgent?.agentType === 'GROUP') {
          return item.groupId !== currentGroupId;
        }
        return item.scopeType === 'GROUP';
      })
      .sort((a, b) {
        const aKey = a.groupId ? `group-${a.groupId}` : 'personal';
        const bKey = b.groupId ? `group-${b.groupId}` : 'personal';
        return (
          (orderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }, [currentAgent, otherSkillGroups, selectedSkills]);

  if (!open) return null;

  return (
    <div className={`${styles.panel} ${popupStyles.surface}`}>
      {primarySkills.length > 0 ? (
        <Menu
          mode="inline"
          selectedKeys={selectedSkillKeys}
          onClick={({ key }) {
            onMenuInteract?.();
            const skill = primarySkills.find((item) => item.skillId === key);
            if (skill) onToggleSkill(skill);
          }}
          items={primarySkillItems}
          className={`${styles.menu} ${popupStyles.menu}`}
        />
      ) : (
        <div className={styles.empty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用 Skill" />
        </div>
      )}

      {advancedMode && (
        <>
          <Divider className={styles.divider} />

          <Menu
            mode="inline"
            selectedKeys={externalSkills.map((s) => s.skillId)}
            onClick={({ key }) {
              onMenuInteract?.();
              if (key === '__select-other__') {
                onOpenOtherSkillModal();
                return;
              }
              onRemoveExternalSkill(key);
            }}
            items={[
              ...externalSkills.map((skill) {{
                key: skill.skillId,
                icon: <RiToolsLine size={16} />,
                label: (
                  <span className={`${chatInputStyles.menuItemRow} ${popupStyles.menuLabel}`}>
                    <span>
                      {skill.displayName}
                      {skill.sourceAgentLabel || skill.groupName ? (
                        <span className={chatInputStyles.capabilitySourceText}>
                          {' '}
                          · {(skill.groupName || skill.sourceAgentLabel) ?? ''}提供
                        </span>
                      ) : null}
                    </span>
                    <span className={chatInputStyles.capabilityCheck}>
                      <CheckIcon />
                    </span>
                  </span>
                ),
              })),
              {
                key: '__select-other__',
                icon: <RiToolsLine size={16} />,
                label: <span className={popupStyles.menuLabel}>选择其他Skill...</span>,
              },
            ]}
            className={`${styles.menu} ${popupStyles.menu}`}
          />
        </>
      )}

      <Divider className={styles.divider} />

      <Menu
        mode="inline"
        selectedKeys={selectedToolKeys}
        onClick={({ key }) {
          onMenuInteract?.();
          const tool = toolOptions.find((item) => item.toolId === key);
          if (tool) onToggleTool(tool);
        }}
        items={toolItems}
        className={`${styles.menu} ${popupStyles.menu}`}
      />
    </div>
  );
}

export default CapabilityPicker;
