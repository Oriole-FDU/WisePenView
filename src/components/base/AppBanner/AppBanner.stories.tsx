import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppButton } from '@/components/base/Button';

import AppBanner from './index';

const meta = {
  title: 'Base/AppBanner',
  component: AppBanner,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: '用于展示页面级提示和补充操作。' } } },
} satisfies Meta<typeof AppBanner>;
export default meta;
type Story = StoryObj;

export const Default: Story = { args: { title: '同步已完成', description: '所有文件均已保存。' } };
export const WithAction: Story = {
  args: {
    title: '需要更新',
    description: '发现新的工作区版本。',
    action: <AppButton size="sm">立即更新</AppButton>,
  },
};
export const WithoutIcon: Story = { args: { title: '无图标提示', icon: false } };
