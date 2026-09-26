import type { Meta, StoryObj } from '@storybook/react-vite';

import AppPopover from './index';
const meta = { title: 'Base/AppPopover', component: AppPopover, tags: ['autodocs'] } satisfies Meta<
  typeof AppPopover
>;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  render: () => (
    <AppPopover>
      <AppPopover.Trigger>打开说明</AppPopover.Trigger>
      <AppPopover.Content title="说明">这是一个通用浮层。</AppPopover.Content>
    </AppPopover>
  ),
};
export const Danger: Story = {
  render: () => (
    <AppPopover>
      <AppPopover.Trigger>删除</AppPopover.Trigger>
      <AppPopover.Content title="确认删除" variant="danger">
        该操作无法撤销。
      </AppPopover.Content>
    </AppPopover>
  ),
};
