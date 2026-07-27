import AppIconButton from '@/components/Button/AppIconButton';
import { Dropdown } from '@heroui/react';
import { EllipsisVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TableRowActionsProps } from './index.type';
import styles from './style.module.less';

function TableRowActions({ actions, ariaLabel, onAction }: TableRowActionsProps) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.moreActions');

  if (actions.length === 0) {
    return null;
  }

  return (
    <Dropdown>
      <AppIconButton
        icon={<EllipsisVertical size={16} aria-hidden="true" />}
        label={resolvedAriaLabel}
        size="sm"
        className={styles.trigger}
        overlayTrigger={<Dropdown.Trigger />}
      />
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={resolvedAriaLabel}
          onAction={(key) => {
            onAction(String(key));
          }}
        >
          {actions.map((action) => (
            <Dropdown.Item
              key={action.key}
              id={action.key}
              textValue={typeof action.label === 'string' ? action.label : action.key}
              isDisabled={action.disabled}
              variant={action.variant === 'danger' ? 'danger' : undefined}
            >
              {action.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default TableRowActions;
