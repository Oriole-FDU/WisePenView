import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import styles from '../Input.stories.module.less';
import NumberField from './index';

function NumberFieldStory() {
  const [value, setValue] = useState(10);

  return (
    <NumberField
      fullWidth
      label="长期记忆条数"
      minValue={1}
      maxValue={50}
      step={1}
      value={value}
      onChange={(nextValue) => setValue(Number(nextValue))}
    >
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

const meta = {
  title: 'Input/数字输入',
  component: NumberField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className={styles.stack}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <NumberFieldStory />,
};

export const Disabled: Story = {
  render: () => (
    <NumberField fullWidth label="长期记忆条数" isDisabled value={10}>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  ),
};
