import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import styles from '../Input.stories.module.less';
import SearchField from './index';

function SearchStory() {
  const [value, setValue] = useState('');

  return (
    <SearchField fullWidth label="搜索资源" value={value} onChange={setValue}>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="输入关键词" />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

const meta = {
  title: 'Input/搜索框',
  component: SearchField,
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
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <SearchStory />,
};

export const Invalid: Story = {
  render: () => (
    <SearchField fullWidth label="搜索资源" isInvalid defaultValue="??">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="输入关键词" />
      </SearchField.Group>
    </SearchField>
  ),
};

export const Disabled: Story = {
  render: () => (
    <SearchField fullWidth label="搜索资源" isDisabled defaultValue="WisePen">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="输入关键词" />
      </SearchField.Group>
    </SearchField>
  ),
};
