import type { TFunction } from 'i18next';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { RefObject } from 'react';

import type { MarkdownResourceResolver } from '@/components/base/Markdown';
import type { SkillFileNode } from '@/domains/Skill';

export interface SkillEditorPanelProps {
  activeContent: string;
  activeEditorKey: string;
  canEdit: boolean;
  configDescription: string;
  configName: string;
  configSaveLoading: boolean;
  contentLoading: boolean;
  isConfigDirty: boolean;
  isConfigSelected: boolean;
  isEditing: boolean;
  markdownPreviewRef: RefObject<HTMLDivElement | null>;
  markdownResourceResolver?: MarkdownResourceResolver;
  navigationVersionLoading: boolean;
  onAnchorNavigate?: (hash: string) => void;
  resourceId: string;
  selectedFile: SkillFileNode | null;
  selectedMarkdownView: string;
  t: TFunction<'skill'>;
  onConfigDescriptionChange: (description: string) => void;
  onConfigNameChange: (name: string) => void;
  onConfigReset: () => void;
  onConfigSave: () => void;
  onEditorMount: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
  onEditorSave: () => void;
  onFileContentChange: (fileId: string, content: string) => void;
  onMarkdownPreviewScroll: (container: HTMLDivElement) => void;
  onMarkdownViewChange: (key: string) => void;
}
