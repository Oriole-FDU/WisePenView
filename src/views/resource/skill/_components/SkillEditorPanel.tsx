import { Tabs } from '@heroui/react';
import type { TFunction } from 'i18next';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { RefObject } from 'react';

import { Empty } from '@/components/base/Feedback';
import Markdown, { type MarkdownResourceResolver } from '@/components/base/Markdown';
import SkillEditor from '@/components/business/Skill/SkillEditor';
import type { SkillFileNode } from '@/domains/Skill';

import styles from '../style.module.less';
import { canPreviewSkillFile } from '../utils/skillFileTree';
import { isMarkdownSkillFile } from '../utils/skillMarkdown';
import SkillConfigPanel from './SkillConfigPanel';

interface SkillEditorPanelProps {
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

function SkillEditorPanel({
  activeContent,
  activeEditorKey,
  canEdit,
  configDescription,
  configName,
  configSaveLoading,
  contentLoading,
  isConfigDirty,
  isConfigSelected,
  isEditing,
  markdownPreviewRef,
  markdownResourceResolver,
  navigationVersionLoading,
  resourceId,
  selectedFile,
  selectedMarkdownView,
  t,
  onConfigDescriptionChange,
  onConfigNameChange,
  onConfigReset,
  onConfigSave,
  onEditorMount,
  onEditorSave,
  onFileContentChange,
  onMarkdownPreviewScroll,
  onMarkdownViewChange,
}: SkillEditorPanelProps) {
  if (isConfigSelected) {
    return (
      <SkillConfigPanel
        name={configName}
        description={configDescription}
        canEdit={canEdit}
        isDirty={isConfigDirty}
        isLoading={configSaveLoading}
        onNameChange={onConfigNameChange}
        onDescriptionChange={onConfigDescriptionChange}
        onReset={onConfigReset}
        onSave={onConfigSave}
      />
    );
  }

  if (!selectedFile) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('preview.selectFile')}
        className={styles.emptyBlock}
      />
    );
  }

  return (
    <>
      <header className={styles.editorHeader}>
        <span className={styles.editorFileName}>{selectedFile.name}</span>
        {isMarkdownSkillFile(selectedFile) ? (
          <Tabs
            className={styles.editorTabs}
            selectedKey={selectedMarkdownView}
            onSelectionChange={(key) => onMarkdownViewChange(String(key))}
          >
            <Tabs.ListContainer>
              <Tabs.List className={styles.editorTabsList} aria-label={t('preview.markdownMode')}>
                <Tabs.Tab id="preview" className={styles.editorTab}>
                  {t('preview.preview')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="markdown" className={styles.editorTab}>
                  {t('preview.markdown')}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        ) : null}
      </header>
      <div className={styles.editorBody}>
        {isMarkdownSkillFile(selectedFile) && selectedMarkdownView === 'preview' ? (
          <div
            ref={markdownPreviewRef}
            className={styles.markdownPreview}
            onScroll={(event) => onMarkdownPreviewScroll(event.currentTarget)}
          >
            <div className={styles.markdownPreviewContent}>
              <Markdown content={activeContent} resourceResolver={markdownResourceResolver} />
            </div>
          </div>
        ) : canPreviewSkillFile(selectedFile) ? (
          <SkillEditor
            content={activeContent}
            fileName={selectedFile.name}
            modelPath={`skill://${encodeURIComponent(resourceId)}/${encodeURIComponent(
              activeEditorKey
            )}/${encodeURIComponent(selectedFile.name)}`}
            readOnly={!isEditing || !canEdit || contentLoading || navigationVersionLoading}
            onSave={onEditorSave}
            onChange={(content) => onFileContentChange(selectedFile.id, content)}
            onEditorMount={onEditorMount}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('preview.unsupported')}
            className={styles.emptyBlock}
          />
        )}
      </div>
    </>
  );
}

export default SkillEditorPanel;
