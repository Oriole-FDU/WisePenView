import type { Meta, StoryObj } from '@storybook/react-vite';

import PieChart from './index';

const meta = {
  title: 'Base/Chart/PieChart',
  component: PieChart,
  tags: ['autodocs'],
} satisfies Meta<typeof PieChart>;
export default meta;
type Story = StoryObj;
const items = [
  { id: 'used', label: '已使用', value: 64 },
  { id: 'pending', label: '处理中', value: 18 },
  { id: 'free', label: '剩余', value: 18 },
];
export const Default: Story = {
  args: { items, ariaLabel: '配额使用情况', title: '本月配额', description: '按任务统计' },
};
export const Empty: Story = {
  args: { items: [], targetValue: 100, ariaLabel: '暂无使用数据', emptyLabel: '暂无数据' },
};
