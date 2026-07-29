import { Spinner } from '@heroui/react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useLatest } from 'ahooks';

import type { SkillEditorProps } from './index.type';
import styles from './style.module.less';

function fileExtToLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'less':
      return 'less';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'ps1':
      return 'powershell';
    case 'bat':
    case 'cmd':
      return 'bat';
    case 'ini':
    case 'env':
      return 'ini';
    case 'xml':
      return 'xml';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'rb':
      return 'ruby';
    case 'pl':
      return 'perl';
    default:
      if (name.toLowerCase() === 'dockerfile') return 'dockerfile';
      return 'plaintext';
  }
}

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
      language={fileExtToLanguage(fileName)}
      value={content}
      onChange={(value) => onChange?.(value ?? '')}
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
          <Spinner />
        </div>
      }
    />
  );
}

export default SkillEditor;
