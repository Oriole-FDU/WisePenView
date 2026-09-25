import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { fn } from 'storybook/test';

import type { AppRouteHandle } from '@/bootstrap/router';
import { APP_SIDEBAR_HEADER_NAV_KEY } from '@/config/appSidebar';
import { ServicesProvider } from '@/domains';
import { AppAuthProvider } from '@/layouts/App/_context';
import {
  type AppNavigationContextValue,
  AppNavigationProvider,
} from '@/layouts/AppNavigation/_context';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import UserFeedbackModal from './_common/footer/UserFeedbackModal';
import UserProfile from './_common/footer/UserProfile';
import AppSidebarTabs from './_common/tab';
import CourseTab from './_common/tab/CourseTab';
import DriveTab from './_common/tab/DriveTab';
import SessionTab from './_common/tab/SessionTab';
import AdminSidebar from './AdminSidebar';
import AppSidebar from './AppSidebar';
import styles from './Sidebar.stories.module.less';

const appNavigationValue: AppNavigationContextValue = {
  canGoBack: false,
  canGoForward: false,
  goBack: () => undefined,
  goForward: () => undefined,
  openCommandPalette: () => undefined,
};

function SidebarStoryFrame({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider>
      <AppAuthProvider mode="authenticated">
        <AppNavigationProvider value={appNavigationValue}>
          <MemoryRouter>{children}</MemoryRouter>
        </AppNavigationProvider>
      </AppAuthProvider>
    </ServicesProvider>
  );
}

function AppSidebarStory() {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        handle: {
          appSidebar: { selectedHeaderNavKey: APP_SIDEBAR_HEADER_NAV_KEY.CHAT },
        } satisfies AppRouteHandle,
        element: (
          <AppSidebar
            canGoBack={false}
            canGoForward={false}
            onGoBack={fn()}
            onGoForward={fn()}
            onToggle={fn()}
          />
        ),
      },
    ],
    { initialEntries: [APP_ROUTE_PATH.CHAT] }
  );

  return (
    <ServicesProvider>
      <AppAuthProvider mode="authenticated">
        <AppNavigationProvider value={appNavigationValue}>
          <RouterProvider router={router} />
        </AppNavigationProvider>
      </AppAuthProvider>
    </ServicesProvider>
  );
}

const meta = {
  title: 'Sidebar/完整模块',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const App: Story = {
  render: () => (
    <div className={styles.sidebarFrame}>
      <AppSidebarStory />
    </div>
  ),
};

export const Admin: Story = {
  render: () => (
    <div className={styles.sidebarFrame}>
      <SidebarStoryFrame>
        <AdminSidebar onToggle={fn()} />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Tabs: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <SidebarStoryFrame>
        <AppSidebarTabs />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Sessions: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <SidebarStoryFrame>
        <SessionTab />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Drive: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <SidebarStoryFrame>
        <DriveTab />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Courses: Story = {
  render: () => (
    <div className={styles.contentFrame}>
      <SidebarStoryFrame>
        <CourseTab />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Profile: Story = {
  render: () => (
    <div className={styles.profileFrame}>
      <SidebarStoryFrame>
        <UserProfile collapsed={false} />
      </SidebarStoryFrame>
    </div>
  ),
};

export const Feedback: Story = {
  render: () => (
    <SidebarStoryFrame>
      <UserFeedbackModal isOpen onOpenChange={fn()} />
    </SidebarStoryFrame>
  ),
};
