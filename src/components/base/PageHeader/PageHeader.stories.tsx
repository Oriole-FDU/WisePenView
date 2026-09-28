import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppButton } from '@/components/base/Button';

import PageHeader from './index';
const meta = { title: 'Base/PageHeader', component: PageHeader, tags: ['autodocs'] } satisfies Meta<
  typeof PageHeader
>;
export default meta;
type Story = StoryObj;
export const Default: Story = { args: { title: '工作区', subtitle: '管理你的知识和协作内容。' } };
export const WithActions: Story = {
  args: { title: '文件列表', actions: <AppButton size="sm">新建文件</AppButton> },
};
