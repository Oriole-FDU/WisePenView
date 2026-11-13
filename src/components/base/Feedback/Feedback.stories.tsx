import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppButton } from '../Button';
import { EmptyState, ErrorState, LoadingState, ResultState, Spin } from './index';

const meta = { title: 'Base/Feedback', component: LoadingState, tags: ['autodocs'] } satisfies Meta<
  typeof LoadingState
>;
export default meta;
type Story = StoryObj;
export const Loading: Story = { args: { label: '正在加载...' } };
export const EmptyBlock: Story = {
  render: () => <EmptyState title="暂无内容" description="创建内容后会显示在这里。" />,
};
export const EmptySimple: Story = {
  render: () => <EmptyState title="暂无数据" showIcon={false} />,
};
export const ErrorBlock: Story = {
  render: () => (
    <ErrorState
      title="加载失败"
      description="请检查网络连接后重试。"
      action={
        <AppButton variant="primary" size="sm">
          重试
        </AppButton>
      }
    />
  ),
};
export const ResultPage: Story = {
  render: () => <ResultState status="500" title="加载失败" subTitle="请稍后重试。" />,
};
export const StoppedSpin: Story = { render: () => <Spin spinning={false} /> };
