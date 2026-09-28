import type { Meta, StoryObj } from '@storybook/react-vite';

import AppBreadcrumb from './index';

const meta = {
  title: 'Base/AppBreadcrumb',
  component: AppBreadcrumb,
  tags: ['autodocs'],
} satisfies Meta<typeof AppBreadcrumb>;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  args: {
    ariaLabel: '路径',
    items: [
      { key: 'home', label: '首页', to: '/' },
      { key: 'workspace', label: '工作区' },
    ],
  },
};
export const LongLabels: Story = {
  args: {
    ariaLabel: '路径',
    items: [
      { key: 'a', label: '知识库与团队协作空间', to: '/' },
      { key: 'b', label: '季度计划与会议记录' },
      { key: 'c', label: '当前文档' },
    ],
  },
};
