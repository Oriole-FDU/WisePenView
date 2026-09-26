import type { Meta, StoryObj } from '@storybook/react-vite';

import ProviderLogo from './index';
const meta = {
  title: 'Business/Icons/ProviderLogo',
  component: ProviderLogo,
  tags: ['autodocs'],
} satisfies Meta<typeof ProviderLogo>;
export default meta;
type Story = StoryObj;
export const Providers: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 18 }}>
      <ProviderLogo provider="openai" size={28} />
      <ProviderLogo provider="claude" size={28} />
      <ProviderLogo provider="gemini" size={28} />
      <ProviderLogo provider="deepseek" size={28} />
    </div>
  ),
};
