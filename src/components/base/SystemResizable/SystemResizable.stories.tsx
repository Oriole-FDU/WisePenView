import type { Meta, StoryObj } from '@storybook/react-vite';

import { SystemResizableHandle, SystemResizablePanel, SystemResizablePanelGroup } from './index';

const meta = {
  title: 'Base/SystemResizable',
  component: SystemResizablePanelGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof SystemResizablePanelGroup>;
export default meta;
type Story = StoryObj;
export const TwoPanels: Story = {
  render: () => (
    <div style={{ width: 620, height: 260 }}>
      <SystemResizablePanelGroup orientation="horizontal">
        <SystemResizablePanel defaultSize={35}>
          <div style={{ padding: 16 }}>导航面板</div>
        </SystemResizablePanel>
        <SystemResizableHandle />
        <SystemResizablePanel>
          <div style={{ padding: 16 }}>内容面板</div>
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  ),
};
