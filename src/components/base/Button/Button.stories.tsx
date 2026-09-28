import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Plus } from 'lucide-react';

import { AppButton, AppIconButton, CopyButton } from './index';

const meta = { title: 'Base/Button', component: AppButton, tags: ['autodocs'] } satisfies Meta<
  typeof AppButton
>;
export default meta;
type Story = StoryObj;
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <AppButton>主要操作</AppButton>
      <AppButton variant="secondary">次要操作</AppButton>
      <AppButton variant="danger">删除</AppButton>
      <AppButton isDisabled>禁用</AppButton>
    </div>
  ),
};
export const IconButton: Story = {
  render: () => <AppIconButton icon={<Plus size={16} />} label="新建" />,
};
export const Copy: Story = { render: () => <CopyButton text="Storybook 示例内容" /> };
export const IconActive: Story = {
  render: () => <AppIconButton icon={<Check size={16} />} label="已完成" isActive />,
};
