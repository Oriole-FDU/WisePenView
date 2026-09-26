import type { Meta, StoryObj } from '@storybook/react-vite';

import QuotaBar from './index';

const meta = { title: 'Base/QuotaBar', component: QuotaBar, tags: ['autodocs'] } satisfies Meta<
  typeof QuotaBar
>;
export default meta;
type Story = StoryObj;
export const Normal: Story = { args: { used: 42, limit: 100 } };
export const NearlyFull: Story = { args: { used: 92, limit: 100 } };
