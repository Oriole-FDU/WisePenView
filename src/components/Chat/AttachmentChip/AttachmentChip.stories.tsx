import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Image as ImageIcon } from 'lucide-react';

import { Chat } from '@/components/Chat';
import styles from './AttachmentChip.stories.module.less';

const thumbnailDataUrl =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="20" fill="#e2e8f0"/>
      <rect x="22" y="22" width="84" height="84" rx="16" fill="#cbd5e1"/>
      <path d="M38 86l16-18 14 14 12-10 10 14H38z" fill="#64748b"/>
      <circle cx="48" cy="46" r="10" fill="#94a3b8"/>
    </svg>
  `);

const meta = {
  title: 'Chat/AttachmentChip',
  component: Chat.AttachmentChip,
  parameters: {
    controls: {
      include: [
        'title',
        'description',
        'kind',
        'state',
        'size',
        'thumbnailUrl',
        'icon',
        'actions',
        'onRemove',
        'removeLabel',
      ],
    },
  },
  args: {
    title: 'report.pdf',
    description: '12.4 MB · Uploaded',
    kind: 'file',
    state: 'done',
    size: 'sm',
    removeLabel: 'Remove attachment',
  },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['file', 'image', 'resource'],
    },
    state: {
      control: 'inline-radio',
      options: ['idle', 'uploading', 'error', 'done'],
    },
    size: {
      control: 'inline-radio',
      options: ['xs', 'sm', 'default'],
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    icon: {
      control: false,
    },
    actions: {
      control: false,
    },
    onRemove: {
      control: false,
    },
  },
} satisfies Meta<typeof Chat.AttachmentChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Uploading: Story = {
  args: {
    state: 'uploading',
    progress: 42,
  },
};

export const ErrorState: Story = {
  args: {
    state: 'error',
    description: 'Upload failed',
  },
};

export const ImagePreview: Story = {
  args: {
    kind: 'image',
    title: 'screenshot.png',
    description: 'Preview ready',
    thumbnailUrl: thumbnailDataUrl,
  },
};

export const ResourceAttachment: Story = {
  args: {
    kind: 'resource',
    title: 'Course outline',
    description: 'Linked context resource',
    icon: <FileText size={16} aria-hidden />,
  },
};

export const Removable: Story = {
  render: (args) => (
    <div className={styles.matrix}>
      <Chat.AttachmentChip
        {...args}
        onRemove={() => undefined}
        icon={<ImageIcon size={16} aria-hidden />}
        title="figma-export.png"
        description="Prepared for review"
      />
    </div>
  ),
};
