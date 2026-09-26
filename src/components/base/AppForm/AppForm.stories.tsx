import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from '@/components/base/Input';

import AppForm from './index';

const meta = {
  title: 'Base/AppForm',
  component: AppForm.Section,
  tags: ['autodocs'],
} satisfies Meta<typeof AppForm.Section>;
export default meta;
type Story = StoryObj;
export const Section: Story = {
  render: () => (
    <AppForm.Section title="基本信息" description="填写工作区的公开信息。">
      <AppForm.Rows>
        <AppForm.Row
          title="名称"
          description="最多 40 个字符。"
          control={<Input aria-label="名称" placeholder="工作区名称" />}
        />
      </AppForm.Rows>
    </AppForm.Section>
  ),
};
