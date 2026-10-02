import type { editor as MonacoEditor } from 'monaco-editor';

export interface SkillEditorProps {
  content: string;
  fileName: string;
  modelPath: string;
  readOnly?: boolean;
  onSave?: () => void;
  onChange?: (content: string) => void;
  onEditorMount?: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
}
