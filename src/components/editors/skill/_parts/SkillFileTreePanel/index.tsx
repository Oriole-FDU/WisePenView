import { FolderPlus, Plus, Upload } from 'lucide-react';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { EmptyState } from '@/components/base/Feedback';
import SkillFileTree from '@/components/editors/skill/_parts/SkillFileTree';

import styles from '../../_common/style.module.scss';
import SkillSaveQueueDock from '../SkillSaveQueueDock';
import type { SkillFileTreePanelProps } from './index.type';

function SkillFileTreePanel({
  canEdit,
  configTreeNodes,
  dirtyNodeIds,
  fileActions,
  fileInputRef,
  files,
  onTreeSelect,
  saveQueueItems,
  selectedFileId,
  selectedTreeNodeId,
  t,
  onRetrySave,
}: SkillFileTreePanelProps) {
  return (
    <section className={styles.middlePanel}>
      <div className={styles.middlePanelHeader}>
        <span className={styles.middlePanelLabel}>{t('fileTree.title')}</span>
        {fileActions.canEditTree ? (
          <div className={styles.middlePanelActions}>
            <AppIconButton
              icon={<FolderPlus size={14} aria-hidden="true" />}
              label={t('fileTree.newFolder')}
              size="sm"
              className={styles.iconBtnSm}
              onClick={() => fileActions.handleStartCreate('folder')}
            />
            <AppIconButton
              icon={<Plus size={14} aria-hidden="true" />}
              label={t('fileTree.newFile')}
              size="sm"
              className={styles.iconBtnSm}
              onClick={() => fileActions.handleStartCreate('file')}
            />
            <AppIconButton
              icon={<Upload size={14} aria-hidden="true" />}
              label={t('fileTree.upload')}
              size="sm"
              className={styles.iconBtnSm}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        ) : null}
      </div>
      <div
        className={`${styles.treeWrap} ${fileActions.isTreeDragOver ? styles.treeWrapDragOver : ''}`}
        onDragOver={fileActions.handleTreeDragOver}
        onDragLeave={fileActions.handleTreeDragLeave}
        onDrop={fileActions.handleTreeDrop}
        onClick={fileActions.handleTreeWrapClick}
      >
        {fileActions.canEditTree && fileActions.isTreeDragOver ? (
          <div className={styles.treeDropHint}>{t('fileTree.dropHint')}</div>
        ) : null}
        <SkillFileTree
          files={files}
          prependNodes={configTreeNodes}
          selectedFileId={selectedFileId}
          selectedNodeId={selectedTreeNodeId}
          expandedKeys={fileActions.expandedKeys}
          pendingCreate={fileActions.pendingCreate}
          dirtyNodeIds={dirtyNodeIds}
          isOwner={fileActions.canEditTree}
          onSelect={onTreeSelect}
          onCommitCreate={fileActions.handleCommitCreate}
          onCancelCreate={fileActions.cancelPendingCreate}
          onDeleteFile={fileActions.handleDeleteFile}
          onMoveFile={fileActions.handleMoveFile}
        />
        {files.length === 0 && !fileActions.pendingCreate ? (
          <EmptyState
            title={t(canEdit ? 'fileTree.emptyEditable' : 'fileTree.empty')}
            showIcon={false}
            size="compact"
            className={styles.emptyBlock}
          />
        ) : null}
      </div>
      {saveQueueItems.length > 0 ? (
        <SkillSaveQueueDock items={saveQueueItems} onRetry={onRetrySave} />
      ) : null}
    </section>
  );
}

export default SkillFileTreePanel;
