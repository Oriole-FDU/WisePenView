import { Dropdown, ListBox } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import styles from '../Input.stories.module.less';
import Select from './index';

const OPTIONS = [
  { id: 'feedback', label: '问题反馈' },
  { id: 'feature', label: '功能建议' },
  { id: 'other', label: '其他事项' },
] as const;

function SelectStory() {
  const [value, setValue] = useState<string[]>(['feedback']);

  return (
    <Select
      fullWidth
      label="反馈类型"
      placeholder="请选择反馈类型"
      selectionMode="multiple"
      value={value}
      onChange={(nextValue) => setValue(nextValue.map(String))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="反馈类型">
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

function SelectSingleStory() {
  const [value, setValue] = useState<string>('feature');

  return (
    <Select
      fullWidth
      label="反馈类型"
      placeholder="请选择反馈类型"
      value={value}
      onChange={(nextValue) => setValue(String(nextValue))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="反馈类型">
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

function DropdownStory() {
  const [selectedKeys, setSelectedKeys] = useState(new Set(['feedback']));

  return (
    <Dropdown>
      <Dropdown.Trigger>打开操作菜单</Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          aria-label="操作菜单"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={(keys) => {
            setSelectedKeys(
              keys === 'all'
                ? new Set(OPTIONS.map((option) => option.id))
                : new Set([...keys].map(String))
            );
          }}
        >
          {OPTIONS.map((option) => (
            <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
          <Dropdown.Item id="delete" textValue="删除" variant="danger">
            删除
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

const meta = {
  title: 'Input/选项浮层',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className={styles.stack}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectMultiple: Story = {
  render: () => <SelectStory />,
};

export const SelectSingle: Story = {
  render: () => <SelectSingleStory />,
};

export const SelectDisabled: Story = {
  render: () => (
    <Select fullWidth isDisabled label="反馈类型" defaultSelectedKey="feedback">
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="反馈类型">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  ),
};

export const DropdownMultiple: Story = {
  render: () => <DropdownStory />,
};
