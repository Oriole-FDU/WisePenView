import type { Meta, StoryObj } from '@storybook/react-vite';

import SkillSaveQueueDock from './index';

const meta = {
  title: 'Editors/Skill/SkillSaveQueueDock',
  component: SkillSaveQueueDock,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SkillSaveQueueDock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FailedWithRetry: Story = {
  args: {
    items: [
      {
        id: 'skill-md',
        kind: 'file',
        name: 'SKILL.md',
        path: '示例 Skill / SKILL.md',
        phase: 'failed',
        progress: 42,
        revision: 3,
        size: 2048,
        errorMessage: '网络连接中断',
      },
    ],
    onRetry: () => undefined,
  },
};
