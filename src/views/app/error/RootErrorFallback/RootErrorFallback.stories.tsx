import type { Meta, StoryObj } from '@storybook/react-vite';

import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

import RootErrorFallback from './index';

const meta = {
  title: 'Views/Errors/RootErrorFallback',
  component: RootErrorFallback,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RootErrorFallback>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE),
    resetErrorBoundary: () => undefined,
  },
};
