import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { AppButton } from '@/components/base/Button';

import AppModal from './index';
const meta = { title: 'Base/AppModal', component: AppModal, tags: ['autodocs'] } satisfies Meta<
  typeof AppModal
>;
export default meta;
type Story = StoryObj;
function ControlledModalStory() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <AppButton onPress={() => setOpen(true)}>打开弹窗</AppButton>
      <AppModal
        isOpen={open}
        onOpenChange={setOpen}
        title="编辑内容"
        description="确认后保存当前修改。"
        actions={<AppButton onPress={() => setOpen(false)}>完成</AppButton>}
      >
        弹窗内容
      </AppModal>
    </>
  );
}
export const Controlled: Story = { render: () => <ControlledModalStory /> };
