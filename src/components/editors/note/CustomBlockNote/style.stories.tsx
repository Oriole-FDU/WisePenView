import type { Meta, StoryObj } from '@storybook/react-vite';
import { createElement } from 'react';

import styles from './style.module.scss';
import storyStyles from './style.stories.module.scss';

const meta = {
  title: 'Editors/Note/CustomBlockNote',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

function ChecklistBlock({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="bn-block-outer">
      <div className="bn-block">
        <div className="bn-block-content" data-content-type="checkListItem">
          <div className={storyStyles.checklistRow}>
            {createElement('input', { type: 'checkbox', checked, readOnly: true })}
            <div className="bn-inline-content">
              <span className={storyStyles.checklistText}>{label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockNoteContent() {
  return (
    <div className="bn-container">
      <div className="bn-editor">
        <ChecklistBlock checked label="已完成的检查项" />
        <ChecklistBlock checked={false} label="待完成的检查项" />
      </div>
    </div>
  );
}

export const Checklist: Story = {
  render: () => (
    <div className={storyStyles.frame}>
      <div className={`${styles.editorShell} ${storyStyles.editorFrame}`}>
        <BlockNoteContent />
      </div>
    </div>
  ),
};

export const DragPreview: Story = {
  render: () => (
    <div className={storyStyles.frame}>
      <div className="bn-drag-preview">
        <BlockNoteContent />
      </div>
    </div>
  ),
};
