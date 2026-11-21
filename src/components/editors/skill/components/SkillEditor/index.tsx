import Editor, { type OnMount } from '@monaco-editor/react';
import { useLatest } from 'ahooks';

import { Spin } from '@/components/base/Feedback';
import { resolveSkillFileLanguage } from '@/domains/Skill';

import type { SkillEditorProps } from './index.type';
import styles from './style.module.scss';

function SkillEditor({
  content,
  fileName,
  modelPath,
  readOnly,
  onSave,
  onChange,
  onEditorMount,
}: SkillEditorProps) {
  const onSaveRef = useLatest(onSave);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current?.();
    });
    onEditorMount?.(editor);
  };

  return (
    <Editor
      height="100%"
      path={modelPath}
      saveViewState
      language={resolveSkillFileLanguage(fileName)}
      value={content}
      onChange={(value, event) => {
        if (!event.isFlush) onChange?.(value ?? '');
      }}
      onMount={handleMount}
      options={{
        readOnly,
        contextmenu: true,
        wordWrap: 'on',
        renderLineHighlight: 'line',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        bracketPairColorization: { enabled: true },
        folding: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        lineHeight: 24,
        padding: { top: 16, bottom: 16 },
      }}
      theme="vs"
      loading={
        <div className={styles.loading}>
          <Spin />
        </div>
      }
    />
  );
}

export default SkillEditor;
