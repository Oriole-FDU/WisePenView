import type { Meta, StoryObj } from '@storybook/react-vite';

import { Chat } from '@/components/Chat';
import type { LoadingTextProps } from './index.type';
import styles from './LoadingText.stories.module.less';

type LoadingTextTone = NonNullable<LoadingTextProps['tone']>;
type LoadingTextSize = NonNullable<LoadingTextProps['size']>;

const tones: LoadingTextTone[] = ['muted', 'default', 'accent'];
const sizes: LoadingTextSize[] = ['xs', 'sm', 'inherit'];

const meta = {
  title: 'Chat/LoadingText',
  component: Chat.LoadingText,
  parameters: {
    controls: {
      include: ['as', 'children', 'tone', 'size', 'animated', 'duration'],
    },
  },
  args: {
    children: 'Thinking through the next response...',
    tone: 'muted',
    size: 'inherit',
    animated: true,
    duration: '2s',
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['span', 'div', 'p'],
    },
    tone: {
      control: 'inline-radio',
      options: tones,
    },
    size: {
      control: 'inline-radio',
      options: sizes,
    },
    animated: {
      control: 'boolean',
    },
    duration: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Chat.LoadingText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  parameters: {
    controls: {
      exclude: ['children', 'tone'],
    },
  },
  render: ({ children: _children, tone: _tone, ...args }) => {
    return (
      <div className={styles.matrix}>
        {tones.map((tone) => (
          <Chat.LoadingText {...args} key={tone} tone={tone}>
            {tone}: Streaming partial reasoning while the model is working.
          </Chat.LoadingText>
        ))}
      </div>
    );
  },
};

export const Sizes: Story = {
  parameters: {
    controls: {
      exclude: ['children', 'size'],
    },
  },
  render: ({ children: _children, size: _size, ...args }) => {
    return (
      <div className={styles.matrix}>
        {sizes.map((size) => (
          <Chat.LoadingText {...args} key={size} size={size}>
            {size}: Reading context, messages, and attached resources.
          </Chat.LoadingText>
        ))}
      </div>
    );
  },
};

export const Static: Story = {
  parameters: {
    controls: {
      exclude: ['animated', 'duration'],
    },
  },
  args: {
    animated: false,
    children: 'Static loading copy for reduced emphasis.',
  },
};

export const Speeds: Story = {
  parameters: {
    controls: {
      exclude: ['children', 'duration'],
    },
  },
  render: ({ children: _children, duration: _duration, ...args }) => {
    return (
      <div className={styles.matrix}>
        <Chat.LoadingText {...args} duration="1s">
          fast: Scanning recent context.
        </Chat.LoadingText>
        <Chat.LoadingText {...args} duration="2s">
          normal: Thinking through the next response.
        </Chat.LoadingText>
        <Chat.LoadingText {...args} duration="3.5s">
          slow: Waiting for model output.
        </Chat.LoadingText>
      </div>
    );
  },
};

export const BlockElement: Story = {
  args: {
    as: 'div',
    tone: 'accent',
    size: 'sm',
    children: 'Block-level loading text can occupy a full message line.',
  },
};
