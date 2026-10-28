import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import editorStyles from '../../style.module.scss';
import { type CodeBlockLanguageOption, CodeBlockToolbar } from './CodeBlockToolbar';

const LANGUAGE_OPTIONS: CodeBlockLanguageOption[] = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'python', label: 'Python' },
];

const meta = {
  title: 'Editors/Note/CodeBlockToolbar',
  component: CodeBlockToolbar,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof CodeBlockToolbar>;
export default meta;
type Story = StoryObj;

function CodeBlockToolbarStory() {
  const [codeElement] = useState(() => {
    const element = document.createElement('pre');
    element.textContent = "const greeting = 'WisePen';";
    return element;
  });

  return (
    <div className={editorStyles.editorShell} style={{ width: 620 }}>
      <div className="bn-editor">
        <div className="bn-block-content" data-content-type="codeBlock">
          <pre>
            <code>{codeElement.textContent}</code>
          </pre>
          <div className="wise-code-block-toolbarWrapper">
            <CodeBlockToolbar
              codeElement={codeElement}
              collapsed={false}
              isEditable
              language="typescript"
              languageOptions={LANGUAGE_OPTIONS}
              onCollapsedChange={() => undefined}
              onLanguageChange={() => undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <CodeBlockToolbarStory />,
};
