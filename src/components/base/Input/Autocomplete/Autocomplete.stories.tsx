import { EmptyState, ListBox, useFilter } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import styles from '../Input.stories.module.less';
import SearchField from '../SearchField';
import Autocomplete from './index';

const OPTIONS = [
  { id: 'feedback', label: '问题反馈', description: '用户提交的问题与缺陷' },
  { id: 'feature', label: '功能建议', description: '希望新增的能力' },
  { id: 'other', label: '其他事项', description: '不属于以上分类的内容' },
] as const;

function MultiSelectStory() {
  const [value, setValue] = useState<string[]>(['feedback']);

  return (
    <Autocomplete
      fullWidth
      label="反馈类型"
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

/** 与 Agent 能力选择一致：触发层里再放一个搜索框过滤选项 */
function WithFilterStory() {
  const { contains } = useFilter({ sensitivity: 'base' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <Autocomplete
      fullWidth
      label="能力"
      placeholder="请选择能力"
      selectionMode="multiple"
      value={selectedIds}
      onChange={(nextValue) => setSelectedIds(nextValue.map(String))}
    >
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField fullWidth autoFocus aria-label="搜索能力">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="搜索能力" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            aria-label="能力"
            selectionMode="multiple"
            renderEmptyState={() => <EmptyState>没有匹配的能力</EmptyState>}
          >
            {OPTIONS.map((option) => (
              <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

const meta = {
  title: 'Input/自动补全',
  component: Autocomplete,
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
} satisfies Meta<typeof Autocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multiple: Story = {
  render: () => <MultiSelectStory />,
};

export const WithFilter: Story = {
  render: () => <WithFilterStory />,
};
