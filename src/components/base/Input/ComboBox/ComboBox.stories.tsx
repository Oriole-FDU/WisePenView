import { ListBox } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import styles from '../Input.stories.module.less';
import ComboBox from './index';

const OPTIONS = [
  { id: 'feedback', label: '问题反馈' },
  { id: 'feature', label: '功能建议' },
  { id: 'other', label: '其他事项' },
] as const;

function ComboBoxStory() {
  const [selectedKey, setSelectedKey] = useState<string | null>('feedback');

  return (
    <ComboBox
      fullWidth
      label="反馈类型"
      selectedKey={selectedKey}
      onSelectionChange={(key) => setSelectedKey(key == null ? null : String(key))}
    >
      <ComboBox.InputGroup>
        <ComboBox.Input aria-label="反馈类型" placeholder="输入或选择反馈类型" />
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

const meta = {
  title: 'Input/组合框',
  component: ComboBox,
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
} satisfies Meta<typeof ComboBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => <ComboBoxStory />,
};

export const Disabled: Story = {
  render: () => (
    <ComboBox fullWidth label="反馈类型" isDisabled defaultSelectedKey="feedback">
      <ComboBox.InputGroup>
        <ComboBox.Input aria-label="反馈类型" placeholder="输入或选择反馈类型" />
        <ComboBox.Trigger aria-label="展开反馈类型" />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox aria-label="反馈类型">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  ),
};
