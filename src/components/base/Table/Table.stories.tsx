import type { Meta, StoryObj } from '@storybook/react-vite';

import { DataTable, FolderTable, type FolderTableRow } from './index';

const meta = { title: 'Base/Table', component: DataTable, tags: ['autodocs'] } satisfies Meta<
  typeof DataTable
>;
export default meta;
type Story = StoryObj;
const rows = [
  { id: '1', name: '产品需求.md', entryType: 'file', typeLabel: 'Markdown', sizeLabel: '12 KB' },
  {
    id: '2',
    name: '设计资料',
    entryType: 'folder',
    typeLabel: '文件夹',
    isExpandable: true,
    children: [{ id: '3', name: '流程图.drawio', entryType: 'file', typeLabel: 'Drawio' }],
  },
] satisfies FolderTableRow[];
export const Data: Story = {
  render: () => (
    <DataTable
      ariaLabel="数据表格"
      rowKey="id"
      items={[
        { id: '1', name: '需求说明', status: '已完成' },
        { id: '2', name: '交互设计', status: '进行中' },
      ]}
      columns={[
        {
          id: 'name',
          label: '名称',
          isRowHeader: true,
          width: 'fill',
          renderCell: (row) => row.name,
        },
        { id: 'status', label: '状态', renderCell: (row) => row.status },
      ]}
      sortDescriptor={{ column: 'name', direction: 'ascending' }}
    />
  ),
};
export const Folder: Story = {
  render: () => (
    <FolderTable
      ariaLabel="文件表格"
      items={rows}
      expandedRowKeys={['2']}
      sortDescriptor={{ column: 'name', direction: 'ascending' }}
    />
  ),
};
export const Loading: Story = {
  render: () => (
    <FolderTable ariaLabel="加载中的文件表格" items={[]} loading skeletonRowCount={3} />
  ),
};
