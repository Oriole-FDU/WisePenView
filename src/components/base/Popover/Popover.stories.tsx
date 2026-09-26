import type { Meta, StoryObj } from '@storybook/react-vite';

import { Popover } from './index';
const meta = { title: 'Base/Popover', component: Popover, tags: ['autodocs'] } satisfies Meta<
  typeof Popover
>;
export default meta;
type Story = StoryObj;
export const Primitive: Story = {
  render: () => (
    <Popover>
      <Popover.Trigger>打开原语浮层</Popover.Trigger>
      <Popover.Content>
        <Popover.Dialog>浮层内容</Popover.Dialog>
      </Popover.Content>
    </Popover>
  ),
};
