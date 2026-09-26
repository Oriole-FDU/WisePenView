import type { Meta, StoryObj } from '@storybook/react-vite';

import Rating from './index';

const meta = { title: 'Base/Rating', component: Rating, tags: ['autodocs'] } satisfies Meta<
  typeof Rating
>;
export default meta;
type Story = StoryObj;
export const Interactive: Story = { args: { value: 3, ariaLabel: '评分' } };
export const Disabled: Story = { args: { value: 4, isDisabled: true } };
