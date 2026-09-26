import type { Meta, StoryObj } from '@storybook/react-vite';

import { DeferredContent, type DeferredOverlayState } from './index';
const meta = {
  title: 'Base/DeferredContent',
  component: DeferredContent,
  tags: ['autodocs'],
} satisfies Meta<typeof DeferredContent>;
export default meta;
type Story = StoryObj;
export const Ready: Story = { args: { children: '内容已挂载', disabled: true } };
export const WithFallback: Story = {
  args: {
    children: ({ ready }: DeferredOverlayState) => (ready ? '内容已挂载' : null),
    fallback: '延迟占位',
    disabled: false,
  },
};
