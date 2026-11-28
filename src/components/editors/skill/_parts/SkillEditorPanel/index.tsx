import { EmptyState } from '@/components/base/Feedback';
import Markdown from '@/components/base/Markdown';
import { Tabs } from '@/components/base/Tabs';
import SkillEditor from '@/components/editors/skill/_parts/SkillEditor';

import { canPreviewSkillFile } from '../../_common/skillFileTree';
import { isMarkdownSkillFile } from '../../_common/skillMarkdown';
import styles from '../../_common/style.module.scss';
import SkillConfigPanel from '../SkillConfigPanel';
import type { SkillEditorPanelProps } from './index.type';

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
  onAnchorNavigate,
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
      <EmptyState title={t('preview.selectFile')} showIcon={false} className={styles.emptyBlock} />
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
              <Markdown
                content={activeContent}
                resourceResolver={markdownResourceResolver}
                onAnchorNavigate={onAnchorNavigate}
              />
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
          <EmptyState
            title={t('preview.unsupported')}
            showIcon={false}
            className={styles.emptyBlock}
          />
        )}
      </div>
    </>
  );
}

export default SkillEditorPanel;
