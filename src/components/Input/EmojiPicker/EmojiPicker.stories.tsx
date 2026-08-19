import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { EmojiPicker, EmojiPickerContent } from '@/components/Input';
import styles from './EmojiPicker.stories.module.less';

const meta = {
  title: 'Input/EmojiPicker',
  component: EmojiPicker,
  parameters: {
    controls: {
      include: ['label', 'disabled', 'onSelect'],
    },
  },
  args: {
    label: '选择表情',
    disabled: false,
    onSelect: fn(),
  },
  argTypes: {
    onSelect: {
      control: false,
    },
  },
} satisfies Meta<typeof EmojiPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '选择表情' }));

    const pickerHost = await within(document.body).findByRole('group', { name: '选择表情' });
    await expect(pickerHost).toBeVisible();
    await waitFor(() => expect(pickerHost.querySelector('em-emoji-picker')).toBeVisible());
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '选择表情' });
    await expect(trigger).toBeDisabled();
  },
};

export const SelectEmoji: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '选择表情' }));

    const pickerHost = await within(document.body).findByRole('group', { name: '选择表情' });
    await waitFor(() => expect(pickerHost.querySelector('em-emoji-picker')).toBeVisible());
    const picker = pickerHost.querySelector('em-emoji-picker');
    await waitFor(() => expect(picker?.shadowRoot).not.toBeNull());

    await waitFor(() =>
      expect(
        picker?.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="😀"]')
      ).toBeVisible()
    );
    const emojiButton =
      picker?.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="😀"]');
    if (!emojiButton) return;

    await userEvent.click(emojiButton);
    await expect(args.onSelect).toHaveBeenCalledWith('😀');
    await waitFor(() =>
      expect(
        within(document.body).queryByRole('group', { name: '选择表情' })
      ).not.toBeInTheDocument()
    );
  },
};

export const Content: Story = {
  parameters: {
    controls: {
      include: ['onSelect'],
    },
  },
  render: ({ onSelect }) => (
    <div className={styles.contentFrame}>
      <EmojiPickerContent ariaLabel="嵌入式表情选择器" onSelect={onSelect} />
    </div>
  ),
};
