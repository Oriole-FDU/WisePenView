import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import type { SkillFileNode } from '@/domains/Skill';

import SkillFileTree from './index';

const FILES: SkillFileNode[] = [
  {
    id: 'root',
    name: '示例 Skill',
    path: '示例 Skill',
    kind: 'folder',
    children: [
      {
        id: 'guide',
        name: 'SKILL.md',
        path: '示例 Skill/SKILL.md',
        kind: 'file',
        language: 'markdown',
      },
      { id: 'script', name: 'scripts', path: '示例 Skill/scripts', kind: 'folder', children: [] },
    ],
  },
];

const meta = {
  title: 'Editors/Skill/SkillFileTree',
  component: SkillFileTree,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SkillFileTree>;
export default meta;
type Story = StoryObj;

function PendingCreateStory() {
  const [selectedNodeId, setSelectedNodeId] = useState('guide');

  return (
    <div style={{ width: 300 }}>
      <SkillFileTree
        files={FILES}
        selectedNodeId={selectedNodeId}
        expandedKeys={['root', 'script']}
        pendingCreate={{ kind: 'file', parentFolderId: 'script' }}
        isOwner
        onSelect={setSelectedNodeId}
        onCommitCreate={() => undefined}
        onCancelCreate={() => undefined}
        onDeleteFile={() => undefined}
      />
    </div>
  );
}

export const PendingCreate: Story = {
  render: () => <PendingCreateStory />,
};
