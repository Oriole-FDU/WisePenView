import type { Meta, StoryObj } from '@storybook/react-vite';

import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

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
    error: createError({
      code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
      source: 'client',
      meta: {
        story: 'RootErrorFallback',
      },
    }),
    resetErrorBoundary: () => undefined,
  },
};
