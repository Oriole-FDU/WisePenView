import { Dropdown, Label } from '@heroui/react';
import { ChevronDown, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';

import type { VersionDropdownProps } from './index.type';

function VersionDropdown({ items, disabledKeys, formatVersion, onSelect }: VersionDropdownProps) {
  const { t } = useTranslation('common');
  const currentItem = items.find((item) => item.current) ?? items[0];

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <AppButton aria-label={t('version.selectAria')} variant="secondary">
          <GitBranch size={16} />
          <span>{currentItem ? formatVersion(currentItem.version) : '-'}</span>
          <ChevronDown size={10} />
        </AppButton>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          disabledKeys={disabledKeys}
          onAction={(key) => {
            const item = items.find((versionItem) => versionItem.key === key);
            if (item) onSelect?.(item.version);
          }}
        >
          {items.map((item) => (
            <Dropdown.Item key={item.key} id={item.key} textValue={formatVersion(item.version)}>
              <Label>
                {formatVersion(item.version)}
                {item.current ? t('version.current') : ''}
              </Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default VersionDropdown;
