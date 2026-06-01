import React, { useMemo } from 'react';
import { Dropdown } from 'antd';
import { LuChevronDown as DownOutlined } from 'react-icons/lu';
import type { MenuProps } from 'antd';
import type { ChatAgentOption } from '@/store';
import type { AgentSelectorProps } from './index.type';
import styles from '../style.module.less';
import popupStyles from '../popupSurface.module.less';

const AgentSelector: React.FC<AgentSelectorProps> = ({
  value,
  options,
  onChange,
  compact = false,
}) => {
  const normalizedValue = value?.agentId ?? options[0]?.agentId;

  const items = useMemo<Required<MenuProps>['items']>(
    () =>
      options.map((option) => ({
        key: option.agentId,
        label: (
          <span className={styles.agentMenuItemLabel}>
            <span>{option.label}</span>
            {option.agentType === 'GROUP' && option.groupName ? (
              <span className={styles.agentMenuItemMeta}>{option.groupName}提供</span>
            ) : null}
          </span>
        ),
      })),
    [options]
  );

  const currentLabel = options.find((option) => option.agentId === normalizedValue)?.label ?? '';

  return (
    <Dropdown
      trigger={['hover']}
      menu={{
        items,
        selectable: true,
        selectedKeys: normalizedValue ? [normalizedValue] : [],
        onClick: ({ key }) => {
          const target = options.find((option) => option.agentId === key);
          if (!target) return;
          onChange(target);
        },
      }}
      placement="bottomRight"
      overlayClassName={popupStyles.dropdownOverlay}
    >
      <button
        type="button"
        className={`${styles.agentSelectorButton} ${compact ? styles.compactAgentSelectorButton : ''}`}
      >
        <span className={styles.agentSelectorValue}>{currentLabel}</span>
        <DownOutlined className={styles.agentSelectorArrow} />
      </button>
    </Dropdown>
  );
};

export default AgentSelector;
