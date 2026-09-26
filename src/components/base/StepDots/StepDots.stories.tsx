import type { Meta, StoryObj } from '@storybook/react-vite';

import StepDots from './index';

const meta = { title: 'Base/StepDots', component: StepDots, tags: ['autodocs'] } satisfies Meta<
  typeof StepDots
>;
export default meta;
type Story = StoryObj;
export const Progress: Story = {
  args: { items: [{ title: '信息' }, { title: '配置' }, { title: '完成' }], current: 1 },
};
export const LastStep: Story = {
  args: { items: [{ title: '信息' }, { title: '配置' }, { title: '完成' }], current: 2 },
};
