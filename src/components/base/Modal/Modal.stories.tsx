import type { Meta, StoryObj } from '@storybook/react-vite';

import { Modal } from './index';
const meta = { title: 'Base/Modal', component: Modal, tags: ['autodocs'] } satisfies Meta<
  typeof Modal
>;
export default meta;
type Story = StoryObj;
export const Primitive: Story = {
  render: () => (
    <Modal>
      <Modal.Trigger>打开原语弹窗</Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>原语弹窗</Modal.Heading>
            </Modal.Header>
            <Modal.Body>基础结构内容</Modal.Body>
            <Modal.CloseTrigger>关闭</Modal.CloseTrigger>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  ),
};
