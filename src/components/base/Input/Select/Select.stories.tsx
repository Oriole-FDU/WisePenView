import { Autocomplete, ComboBox, Dropdown, Input, ListBox } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

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

function ComboBoxStory() {
  const [selectedKey, setSelectedKey] = useState<string | null>('feedback');

  return (
    <ComboBox
      selectedKey={selectedKey}
      onSelectionChange={(key) => setSelectedKey(key == null ? null : String(key))}
    >
      <ComboBox.InputGroup>
        <Input aria-label="搜索反馈类型" placeholder="搜索反馈类型" variant="secondary" />
        <ComboBox.Trigger aria-label="展开反馈类型" />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox aria-label="反馈类型">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

function AutocompleteStory() {
  const [value, setValue] = useState<string[]>(['feedback']);

  return (
    <Autocomplete
      placeholder="请选择反馈类型"
      selectionMode="multiple"
      value={value}
      onChange={(nextValue) => setValue(nextValue.map(String))}
    >
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <ListBox aria-label="反馈类型">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

const meta = {
  title: 'Input/选项浮层',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectMultiple: Story = {
  render: () => <SelectStory />,
};

export const DropdownMultiple: Story = {
  render: () => <DropdownStory />,
};

export const ComboBoxSingle: Story = {
  render: () => <ComboBoxStory />,
};

export const AutocompleteMultiple: Story = {
  render: () => <AutocompleteStory />,
};
