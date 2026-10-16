import { Dropdown, ListBox } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import AppPopover from '@/components/base/AppPopover';
import { AppButton } from '@/components/base/Button';
import Input from '@/components/base/Input/Input';
import Select from '@/components/base/Input/Select';

import styles from './Radius.stories.module.less';

const OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '我加入的' },
  { id: 'managed', label: '我管理的' },
] as const;

function SelectExample() {
  return (
    <Select label="Select trigger 6px / 展开面板 12px" defaultSelectedKey="all">
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="选择范围">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function DropdownExample() {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <AppButton variant="secondary">操作菜单</AppButton>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label="操作菜单" selectionMode="single" defaultSelectedKeys={['mine']}>
          {OPTIONS.map((option) => (
            <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

const meta = {
  title: 'Foundations/圆角系统',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlayStates: Story = {
  render: () => (
    <div className={styles.grid}>
      <AppPopover>
        <AppPopover.Trigger>
          <AppButton>打开 Popover</AppButton>
        </AppPopover.Trigger>
        <AppPopover.Content title="浮层标题">
          <div className={styles.popoverContent}>外壳 12px，内层选中项 6px。</div>
        </AppPopover.Content>
      </AppPopover>
      <DropdownExample />
      <SelectExample />
    </div>
  ),
};
export const InteractiveControls: Story = {
  render: () => (
    <div className={styles.grid}>
      <AppButton>标准按钮</AppButton>
      <AppButton variant="secondary">次要按钮</AppButton>
      <Input aria-label="工作区名称" defaultValue="WisePen" />
      <div className={styles.tableControl} tabIndex={0}>
        Table control
      </div>
    </div>
  ),
};
export const SidebarStates: Story = {
  render: () => (
    <nav className={styles.sidebar} aria-label="侧栏圆角状态">
      <button type="button" className={styles.sidebarItem}>
        未选中项
      </button>
      <button type="button" className={`${styles.sidebarItem} ${styles.sidebarItemSelected}`}>
        选中项
      </button>
      <button type="button" className={styles.sidebarItem} data-hovered="true">
        Hover 状态
      </button>
    </nav>
  ),
};
