import { Dropdown } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import popupStyles from '../popupSurface.module.less';
import styles from '../style.module.less';
import type { AgentSelectorProps } from './index.type';

function AgentSelector({ selectedAgent, options, onChange, compact = false }: AgentSelectorProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button
          type="button"
          className={`${styles.agentSelectorButton} ${compact ? styles.compactAgentSelectorButton : ''}`}
        >
          <span className={styles.agentSelectorValue}>{selectedAgent.label}</span>
          <ChevronDown className={styles.agentSelectorArrow} size={14} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className={popupStyles.dropdownOverlay}>
        <Dropdown.Menu
          aria-label="选择智能体"
          selectionMode="single"
          selectedKeys={[selectedAgent.agentId]}
          onAction={(key) => {
            const target = options.find((option) => option.agentId === key);
            if (!target) return;
            onChange(target);
          }}
        >
          {options.map((option) => (
            <Dropdown.Item key={option.agentId} id={option.agentId} textValue={option.label}>
              <span className={styles.agentMenuItemLabel}>
                <span>{option.label}</span>
                {option.agentType === 'GROUP' && option.groupName ? (
                  <span className={styles.agentMenuItemMeta}>{option.groupName}提供</span>
                ) : null}
              </span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default AgentSelector;
