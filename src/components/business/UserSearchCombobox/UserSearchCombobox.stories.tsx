import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';

import type { UserSearchUser } from '@/domains/User';

import UserSearchCombobox from './index';

const USERS: UserSearchUser[] = [
  {
    userId: 'user-1',
    username: 'an.zhang',
    realName: '张安',
    identityType: 1,
  },
  {
    userId: 'user-2',
    username: 'an.liu',
    nickname: '安同学',
    identityType: 1,
  },
];

const meta = {
  title: 'Business/UserSearchCombobox',
  component: UserSearchCombobox,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof UserSearchCombobox>;
export default meta;
type Story = StoryObj;

function SearchResultsStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('an');

  /**
   * @wisepen-manual-effect
   * 执行时机：Story 挂载后自动聚焦搜索框，以展示候选项状态。
   * 不可替代原因：组件只在真实焦点状态下展开候选列表。
   * cleanup：只执行一次聚焦，不建立订阅或计时器。
   */
  useEffect(() => {
    const input = rootRef.current?.querySelector('input');
    input?.focus();
  }, []);

  return (
    <div ref={rootRef} style={{ width: 420 }}>
      <UserSearchCombobox
        value={value}
        onValueChange={setValue}
        onSelect={() => undefined}
        queryUsers={() => Promise.resolve(USERS)}
        ariaLabel="搜索协作者"
        submitLabel="添加"
      />
    </div>
  );
}

export const SearchResults: Story = {
  render: () => <SearchResultsStory />,
};
