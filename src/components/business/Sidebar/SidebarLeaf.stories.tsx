import type { Meta, StoryObj } from '@storybook/react-vite';
import { Folder, MessageSquarePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';

import { ServicesProvider } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { buildDriveNodeScope, type RootNode } from '@/domains/Drive';

import UserFeedbackModal from './_common/footer/UserFeedbackModal';
import UserProfile from './_common/footer/UserProfile';
import HeaderNav from './_common/header/HeaderNav';
import type { HeaderNavItem } from './_common/header/HeaderNav/index.type';
import NavigationControls from './_common/header/NavigationControls';
import SidebarHeader from './_common/header/SidebarHeader';
import SidebarDriveNodeTitle from './_common/tab/DriveTab/SidebarDriveNodeTitle';
import SidebarDriveScopeSwitcher from './_common/tab/DriveTab/SidebarDriveScopeSwitcher';
import SessionMenuItem from './_common/tab/SessionTab/SessionMenuItem';
import AdminHeaderNav from './AdminSidebar/AdminHeaderNav';
import styles from './Sidebar.stories.module.less';

const session: ChatSession = {
  id: 'storybook-session',
  userId: 'storybook-user',
  title: 'Storybook 会话',
  createdAt: '2026-09-08T09:00:00Z',
  updatedAt: '2026-09-08T09:00:00Z',
};

const driveRoot: RootNode = {
  id: 'drive-root',
  type: 'root',
  parentId: null,
  scope: buildDriveNodeScope(),
  name: '我的云盘',
  tagId: 'tag-root',
  canMountResources: true,
};

const headerItems: readonly HeaderNavItem[] = [
  {
    key: 'chat',
    name: '新建对话',
    icon: MessageSquarePlus,
    onPress: fn(),
  },
  {
    key: 'drive',
    name: '我的云盘',
    icon: Folder,
    onPress: fn(),
  },
];

function LeafStoryFrame({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </ServicesProvider>
  );
}

const meta = {
  title: 'Sidebar/小组件',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdminNavigation: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <LeafStoryFrame>
        <AdminHeaderNav collapsed={false} />
      </LeafStoryFrame>
    </div>
  ),
};

export const HeaderControls: Story = {
  render: () => (
    <NavigationControls
      sidebarCollapsed={false}
      canGoBack
      canGoForward={false}
      onGoBack={fn()}
      onGoForward={fn()}
      onToggleSidebar={fn()}
    />
  ),
};

export const HeaderNavigation: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <HeaderNav ariaLabel="应用导航" activeKey="chat" items={headerItems} showIndicator />
    </div>
  ),
};

export const Header: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <SidebarHeader
        collapsed={false}
        canGoBack
        canGoForward={false}
        onGoBack={fn()}
        onGoForward={fn()}
        onToggle={fn()}
        nav={<HeaderNav ariaLabel="应用导航" activeKey="chat" items={headerItems} showIndicator />}
      />
    </div>
  ),
};

export const UserFeedback: Story = {
  render: () => (
    <LeafStoryFrame>
      <UserFeedbackModal isOpen onOpenChange={fn()} />
    </LeafStoryFrame>
  ),
};

export const UserProfileMenu: Story = {
  render: () => (
    <div className={styles.profileFrame}>
      <LeafStoryFrame>
        <UserProfile collapsed={false} menuMode="admin" />
      </LeafStoryFrame>
    </div>
  ),
};

export const SessionMenu: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <LeafStoryFrame>
        <SessionMenuItem session={session} onUpdated={async () => undefined} onDeleted={fn()} />
      </LeafStoryFrame>
    </div>
  ),
};

export const DriveRootNode: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <LeafStoryFrame>
        <SidebarDriveNodeTitle
          node={driveRoot}
          onCreateNode={fn()}
          onCollapseAll={fn()}
          onRenameNode={fn()}
          onDeleteNode={fn()}
          scopeSwitcher={<SidebarDriveScopeSwitcher />}
        />
      </LeafStoryFrame>
    </div>
  ),
};

export const DriveScopeSwitcher: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <LeafStoryFrame>
        <SidebarDriveScopeSwitcher />
      </LeafStoryFrame>
    </div>
  ),
};
