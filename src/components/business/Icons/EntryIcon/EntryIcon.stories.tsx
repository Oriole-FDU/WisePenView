import type { Meta, StoryObj } from '@storybook/react-vite';

import EntryIcon from './index';
const meta = {
  title: 'Business/Icons/EntryIcon',
  component: EntryIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof EntryIcon>;
export default meta;
type Story = StoryObj;
export const CommonEntries: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 18 }}>
      <EntryIcon entryType="root" />
      <EntryIcon entryType="folder" />
      <EntryIcon entryType="file" />
      <EntryIcon entryType="link" />
      <EntryIcon entryType="loading" />
    </div>
  ),
};
export const ResourceTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 18 }}>
      <EntryIcon entryType="resource" resourceIconType="note" />
      <EntryIcon entryType="resource" resourceIconType="pdf" />
      <EntryIcon entryType="resource" resourceIconType="agent" />
      <EntryIcon entryType="resource" resourceIconType="image" />
    </div>
  ),
};
