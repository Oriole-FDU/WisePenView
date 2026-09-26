import type { Meta, StoryObj } from '@storybook/react-vite';

import Avatar from './index';

const meta = { title: 'Base/Avatar', component: Avatar, tags: ['autodocs'] } satisfies Meta<
  typeof Avatar
>;
export default meta;
type Story = StoryObj;
export const Fallback: Story = {
  render: () => (
    <Avatar size="lg">
      <Avatar.Fallback>知</Avatar.Fallback>
    </Avatar>
  ),
};
export const WithImage: Story = {
  render: () => (
    <Avatar size="lg">
      <Avatar.Image src="https://i.pravatar.cc/96?img=12" alt="用户头像" />
    </Avatar>
  ),
};
