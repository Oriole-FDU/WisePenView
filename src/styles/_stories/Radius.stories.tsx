import { Dropdown, ListBox } from '@heroui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import AppModal from '@/components/base/AppModal';
import AppPopover from '@/components/base/AppPopover';
import { AppButton } from '@/components/base/Button';
import { Checkbox } from '@/components/base/Input';
import Input from '@/components/base/Input/Input';
import Select from '@/components/base/Input/Select';
import { DataTable } from '@/components/base/Table';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppSidebarTabs from '@/components/business/Sidebar/_common/tab';
import { ServicesProvider } from '@/domains';
import { AppAuthProvider } from '@/layouts/App/_context';
import { AppNavigationProvider } from '@/layouts/AppNavigation/_context';

import styles from './Radius.stories.module.scss';

const OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '我加入的' },
  { id: 'managed', label: '我管理的' },
] as const;

const appNavigationValue = {
  canGoBack: false,
  canGoForward: false,
  goBack: () => undefined,
  goForward: () => undefined,
  openCommandPalette: () => undefined,
};

function SidebarExample({ children }: { children: ReactNode }) {
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

function SelectExample() {
  return (
    <Select label="Select trigger 8px / 展开面板 12px" defaultSelectedKey="all">
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="选择范围">
          {OPTIONS.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function DropdownExample() {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <AppButton variant="secondary">操作菜单</AppButton>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label="操作菜单" selectionMode="single" defaultSelectedKeys={['mine']}>
          {OPTIONS.map((option) => (
            <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

const meta = {
  title: 'Foundations/圆角系统',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlayStates: Story = {
  render: () => (
    <div className={styles.grid}>
      <AppPopover>
        <AppPopover.Trigger>
          <AppButton>打开 Popover</AppButton>
        </AppPopover.Trigger>
        <AppPopover.Content title="浮层标题">
          <ListBox aria-label="浮层选中项" selectionMode="single" defaultSelectedKeys={['mine']}>
            {OPTIONS.map((option) => (
              <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </AppPopover.Content>
      </AppPopover>
      <DropdownExample />
      <SelectExample />
    </div>
  ),
};
export const InteractiveControls: Story = {
  render: () => (
    <div className={styles.grid}>
      <AppButton>标准按钮</AppButton>
      <AppButton variant="secondary">次要按钮</AppButton>
      <Input aria-label="工作区名称" defaultValue="WisePen" />
      <DataTable
        ariaLabel="圆角规范表格"
        rowKey="id"
        items={[{ id: '1', name: 'Table control', radius: '单元格圆角' }]}
        columns={[
          { id: 'name', label: '控件', isRowHeader: true, renderCell: (row) => row.name },
          { id: 'radius', label: '圆角', renderCell: (row) => row.radius },
        ]}
        virtualized={false}
      />
    </div>
  ),
};
export const SmallSurfaceRadius: Story = {
  render: () => (
    <div className={styles.smallGrid}>
      <div className={styles.sampleCard}>
        <span className={styles.sampleLabel}>--app-radius-detail · 2px</span>
        <div className={styles.sampleRow}>
          <span className={styles.legendSwatch} />
          <span className={styles.tabTrack}>
            <span className={styles.tabIndicator} />
          </span>
          <span className={styles.textHighlight}>行内文本高亮</span>
          <span className={styles.dividerBlock} />
        </div>
      </div>
      <div className={styles.sampleCard}>
        <span className={styles.sampleLabel}>--app-radius-inline · 4px</span>
        <div className={styles.sampleRow}>
          <code className={styles.inlineCode}>inline code</code>
          <span className={styles.inlineFormula}>a² + b² = c²</span>
          <span className={styles.skeletonBlock} />
        </div>
      </div>
      <div className={styles.sampleCard}>
        <span className={styles.sampleLabel}>--app-radius-checkbox · 4px</span>
        <div className={styles.sampleRow}>
          <Checkbox isSelected={false}>未选中</Checkbox>
          <Checkbox isSelected>已选中</Checkbox>
          <Checkbox isSelected isIndeterminate>
            半选
          </Checkbox>
          <Checkbox isSelected={false} isDisabled>
            禁用
          </Checkbox>
        </div>
      </div>
    </div>
  ),
};

export const SidebarStates: Story = {
  render: () => (
    <SidebarExample>
      <div className={styles.sidebarFrame}>
        <AppSidebarTabs />
      </div>
    </SidebarExample>
  ),
};

function CoverModalRadiusStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <AppButton variant="secondary" onPress={() => setIsOpen(true)}>
        打开 Cover Modal（保留 12px 圆角）
      </AppButton>
      <AppModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Cover Modal"
        description="size=cover，同样铺满视口，但保留 12px 圆角"
        size="cover"
        actions={<AppButton onPress={() => setIsOpen(false)}>关闭</AppButton>}
      >
        Cover 尺寸弹窗内容
      </AppModal>
    </>
  );
}

export const CoverModalRadius: Story = {
  render: () => <CoverModalRadiusStory />,
};

function FullModalRadiusStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <AppButton variant="secondary" onPress={() => setIsOpen(true)}>
        打开 Full Modal（保持直角）
      </AppButton>
      <AppModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Full Modal"
        description="size=full，铺满视口且保持直角"
        size="full"
        placement="center"
        actions={<AppButton onPress={() => setIsOpen(false)}>关闭</AppButton>}
      >
        Full 尺寸铺满视口的弹窗内容
      </AppModal>
    </>
  );
}

export const FullModalRadius: Story = {
  render: () => <FullModalRadiusStory />,
};

function AlertDialogRadiusStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <AppButton variant="secondary" onPress={() => setIsOpen(true)}>
        打开 AlertDialog（12px 圆角）
      </AppButton>
      <AppAlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="AlertDialog"
        description="size 默认，确认操作并验证弹窗圆角。"
      >
        AlertDialog 内容
      </AppAlertDialog>
    </>
  );
}

export const AlertDialogRadius: Story = {
  render: () => <AlertDialogRadiusStory />,
};

function CoverAlertDialogRadiusStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <AppButton variant="secondary" onPress={() => setIsOpen(true)}>
        打开 Cover AlertDialog（保留 12px 圆角）
      </AppButton>
      <AppAlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Cover AlertDialog"
        description="size=cover，验证满尺寸变体的圆角与底部操作区。"
        size="cover"
      >
        Cover AlertDialog 内容
      </AppAlertDialog>
    </>
  );
}

export const CoverAlertDialogRadius: Story = {
  render: () => <CoverAlertDialogRadiusStory />,
};
