import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import Tree, { type DataNode } from './index';

const treeData: DataNode[] = [
  {
    key: 'docs',
    title: '文档',
    children: [
      { key: 'guide', title: '使用指南', isLeaf: true },
      { key: 'api', title: 'API 参考', isLeaf: true },
    ],
  },
  { key: 'loading', title: '懒加载目录', isLeaf: false },
];
const meta = { title: 'Base/Tree', component: Tree, tags: ['autodocs'] } satisfies Meta<
  typeof Tree
>;
export default meta;
type Story = StoryObj;
function SelectableTreeStory() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <Tree
      treeData={treeData}
      defaultExpandedKeys={['docs']}
      selectedKeys={selected}
      onSelect={(keys) => setSelected(keys.map(String))}
    />
  );
}
export const Selectable: Story = { render: () => <SelectableTreeStory /> };
export const CheckableAndDraggable: Story = {
  args: { treeData, defaultExpandAll: true, checkable: true, draggable: true },
};
export const LoadFailureRetry: Story = {
  render: () => (
    <Tree
      treeData={treeData}
      onLoadError={(error) => console.error('示例懒加载失败', error)}
      loadData={async (node) => {
        if (node.key === 'loading') return Promise.reject('模拟加载失败');
      }}
    />
  ),
};
