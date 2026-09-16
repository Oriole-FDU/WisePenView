import type { TFunction } from 'i18next';
import { FolderPlus, Plus, Upload } from 'lucide-react';
import type { RefObject } from 'react';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { Empty } from '@/components/base/Feedback';
import type { DataNode } from '@/components/base/Tree';
import SkillFileTree from '@/components/business/Skill/SkillFileTree';
import type { SkillFileNode } from '@/domains/Skill';

import type { useSkillFileActionsController } from '../_controllers/useSkillFileActionsController';
import styles from '../style.module.less';
import SkillSaveQueueDock from './SkillSaveQueueDock';
import type { SkillSaveQueueItem } from './SkillSaveQueueDock/index.type';

type SkillFileActions = ReturnType<typeof useSkillFileActionsController>;

interface SkillFileTreePanelProps {
  canEdit: boolean;
  configTreeNodes: DataNode[];
  dirtyNodeIds: Set<string>;
  fileActions: SkillFileActions;
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: SkillFileNode[];
  onTreeSelect: (nodeId: string) => void;
  saveQueueItems: SkillSaveQueueItem[];
  selectedFileId: string;
  selectedTreeNodeId: string;
  t: TFunction<'skill'>;
  onRetrySave: () => void;
}

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
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t(canEdit ? 'fileTree.emptyEditable' : 'fileTree.empty')}
            className={styles.emptyBlock}
          />
        ) : null}
      </div>
      <SkillSaveQueueDock items={saveQueueItems} onRetry={onRetrySave} />
    </section>
  );
}

export default SkillFileTreePanel;
