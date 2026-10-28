import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './message-scroller';
import styles from './message-scroller.stories.module.scss';

const meta = {
  title: 'Base/MessageScroller',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const ITEMS = Array.from({ length: 12 }, (_, index) => `消息 ${index + 1}`);

export const ViewportFade: Story = {
  render: () => (
    <div className={styles.frame}>
      <MessageScrollerProvider autoScroll={false} defaultScrollPosition="start">
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {ITEMS.map((item, index) => (
                <MessageScrollerItem key={item} messageId={`message-${index + 1}`}>
                  <div className={styles.item}>{item}</div>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  ),
};
