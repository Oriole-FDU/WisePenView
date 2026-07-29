import AppIconButton from '@/components/Button/AppIconButton';
import { Empty, ResultState, Spin } from '@/components/Feedback';
import Markdown from '@/components/Markdown';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import SkillEditor from '@/components/Skill/SkillEditor';
import SkillFileTree from '@/components/Skill/SkillFileTree';
import type { DataNode } from '@/components/Tree';
import VersionDropdown from '@/components/VersionDropdown';
import { SkillServicesMap } from '@/domains/Skill';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import type { ResourceHostLayoutConfig } from '@/views/workspace/ResourceHostContext';
import { Button, Tabs, toast } from '@heroui/react';
import { FolderPlus, Pencil, Plus, Save, Settings, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ResourceLayoutConfig from '../_components/ResourceLayoutConfig';
import SkillConfigPanel from './_components/SkillConfigPanel';
import SkillSaveQueueDock from './_components/SkillSaveQueueDock';
import UnsavedSkillChangesModal from './_components/UnsavedSkillChangesModal';
import { useSkillFileActionsController } from './_controllers/useSkillFileActionsController';
import { useSkillMarkdownPreviewController } from './_controllers/useSkillMarkdownPreviewController';
import {
  SKILL_CONFIG_NODE_ID,
  useSkillNavigationController,
} from './_controllers/useSkillNavigationController';
import { useSkillResourceController } from './_controllers/useSkillResourceController';
import { useSkillSaveController } from './_controllers/useSkillSaveController';
import { useSkillWorkspaceDraftController } from './_controllers/useSkillWorkspaceDraftController';
import {
  canEditSkill,
  canPreviewSelectedSkillFile,
  formatSkillSaveStatus,
  getDisabledSkillVersionKeys,
  getSkillConfigBadge,
  getSkillVersionItems,
} from './model';
import styles from './style.module.less';
import { canPreviewSkillFile } from './utils/skillFileTree';
import { isMarkdownSkillFile } from './utils/skillMarkdown';

interface SkillViewProps {
  resourceId: string;
}

function SkillView({ resourceId }: SkillViewProps) {
  const { t } = useTranslation('skill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resource = useSkillResourceController(resourceId);
  const workspace = useSkillWorkspaceDraftController(resource.skill);
  const canEdit = canEditSkill(resource.skill, workspace.state.viewingVersion);
  const isConfigSelected = workspace.state.selectedTreeNodeId === SKILL_CONFIG_NODE_ID;
  const selectedFile = isConfigSelected ? null : workspace.selectedFile;
  const canPreviewSelectedFile = canPreviewSelectedSkillFile(selectedFile);
  const save = useSkillSaveController({
    activeFileSnapshots: workspace.activeFileSaveSnapshots,
    canEdit,
    configSnapshot: workspace.configSaveSnapshot,
    fileSnapshots: workspace.fileSaveSnapshots,
    onConfigSaveFailed: workspace.applyConfigSaveFailure,
    onConfigSaveStarted: workspace.markConfigSaveStarted,
    onConfigSaved: workspace.applyConfigSave,
    onFileSaveFailed: workspace.applyFileSaveFailure,
    onFileSaveStarted: workspace.markFileSaveStarted,
    onFilesSaved: workspace.applyFileSaveResults,
    refreshSkill: resource.refreshSkill,
    skill: resource.skill,
  });
  const fileActions = useSkillFileActionsController({
    applyLoadedContent: workspace.applyLoadedContent,
    applyMove: workspace.applyMove,
    canEdit,
    dirtyFileIds: workspace.dirtyFileIds,
    files: workspace.state.files,
    getFileDraft: workspace.getFileDraft,
    getFileSaveSnapshots: workspace.getFileSaveSnapshots,
    isSaving: save.isSaving,
    onLocalFilesAdded: workspace.addLocalFiles,
    onLocalFolderAdded: workspace.addLocalFolder,
    onMoveSaveFailed: workspace.applyFileSaveFailure,
    onMoveSaveStarted: workspace.markFileSaveStarted,
    onNodesDeleted: workspace.removeNodes,
    onPersistedMutation: resource.refreshSkill,
    onQueueItemsRemoved: save.removeQueueItems,
    onSelectionCleared: workspace.clearSelection,
    onTreeNodeSelected: workspace.selectTreeNode,
    selectedFile,
    selectedFileId: workspace.state.selectedFileId,
    selectedTreeNodeId: workspace.state.selectedTreeNodeId,
    skill: resource.skill,
    viewingVersion: workspace.state.viewingVersion,
  });
  const navigation = useSkillNavigationController({
    clearDraftCache: workspace.clearDraftCache,
    configValuesMissing:
      workspace.state.configName.trim().length === 0 ||
      workspace.state.configDescription.trim().length === 0,
    discardAll: workspace.discardAll,
    editing: workspace.state.editing,
    files: workspace.state.files,
    hasUnsavedChanges: workspace.hasUnsavedChanges,
    isSaving: save.isSaving,
    onConfigSelected: () => workspace.selectConfig(SKILL_CONFIG_NODE_ID),
    onEditingChanged: workspace.setEditing,
    onVersionFilesLoaded: workspace.replaceVersion,
    pendingIntent: workspace.state.pendingIntent,
    persistedFiles: workspace.state.persistedFiles,
    refreshSkill: resource.refreshSkill,
    saveAll: save.saveAll,
    savedConfigValuesMissing:
      workspace.state.savedConfigName.trim().length === 0 ||
      workspace.state.savedConfigDescription.trim().length === 0,
    setPendingIntent: workspace.setPendingIntent,
    skill: resource.skill,
    viewingVersion: workspace.state.viewingVersion,
  });
  const handleTreeSelect = (nodeId: string) => {
    if (nodeId === SKILL_CONFIG_NODE_ID) {
      fileActions.cancelPendingCreate();
      workspace.selectConfig(SKILL_CONFIG_NODE_ID);
      return;
    }
    fileActions.handleTreeSelect(nodeId);
  };
  const handleEditorSave = () => {
    if (fileActions.moveLoading) {
      toast.warning(t('toast.moveInProgress'));
      return;
    }
    save.handleSaveCurrentFile();
  };
  const {
    onEditorMount: handleMarkdownEditorMount,
    onPreviewScroll: handleMarkdownPreviewScroll,
    onViewChange: handleMarkdownViewChange,
    previewRef: markdownPreviewRef,
    resourceResolver: markdownResourceResolver,
    selectedView: selectedMarkdownView,
  } = useSkillMarkdownPreviewController({
    editorContent: workspace.activeContent,
    files: workspace.state.files,
    onSelectFile: handleTreeSelect,
    selectedFile,
    selectedFileKey: workspace.activeEditorKey,
    skill: resource.skill,
    viewingVersion: workspace.state.viewingVersion ?? undefined,
  });
  const versionItems = getSkillVersionItems(resource.skill, workspace.state.viewingVersion);
  const disabledVersionKeys = getDisabledSkillVersionKeys(resource.skill, versionItems);
  const configValuesMissing =
    workspace.state.configName.trim().length === 0 ||
    workspace.state.configDescription.trim().length === 0;
  const configBadge = getSkillConfigBadge(configValuesMissing, workspace.isConfigDirty);
  const headerSaveStatusText = formatSkillSaveStatus(canEdit ? save.savePhase : undefined, t);

  const headerConfig = {
    sidePanel: resource.skill?.resourceInfo
      ? { resource: resource.skill.resourceInfo, onResourceChanged: resource.refreshSkill }
      : undefined,
    header: {
      resource: {
        resourceId: resource.skill?.resourceId ?? resourceId,
        resourceName: resource.skill?.title || t('page.resourceFallbackName'),
        resourceIconType: 'skill',
        currentActions: resource.skill?.currentActions,
        copyVersion: resource.skill?.version,
        permissionResourceType: RESOURCE_KIND.SKILL,
        ownerId: resource.skill?.ownerId,
        onPermissionSuccess: resource.refreshSkill,
        titleMeta: headerSaveStatusText ? (
          <span
            className={`${styles.toolbarSaveStatus} ${
              save.savePhase === 'dirty' || save.savePhase === 'failed'
                ? styles.toolbarSaveStatusDirty
                : ''
            }`}
          >
            {headerSaveStatusText}
          </span>
        ) : undefined,
        actions: resource.skill ? (
          <div className={styles.topBarActions}>
            {canEdit ? (
              <>
                <Button
                  variant="secondary"
                  onPress={navigation.handleToggleEditing}
                  isDisabled={
                    (!workspace.state.editing && !canPreviewSelectedFile) ||
                    fileActions.contentLoading ||
                    save.isSaving ||
                    fileActions.moveLoading
                  }
                >
                  <Pencil size={16} />
                  <span>{t(workspace.state.editing ? 'header.cancelEditing' : 'header.edit')}</span>
                </Button>
                {workspace.state.editing || save.hasSaveableChanges ? (
                  <Button
                    variant="secondary"
                    onPress={save.handleSaveAll}
                    isDisabled={
                      !save.hasSaveableChanges || save.isSaving || fileActions.moveLoading
                    }
                  >
                    <Save size={16} />
                    <span>{t('header.save')}</span>
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onPress={navigation.handlePublish}
                  isDisabled={
                    navigation.publishLoading ||
                    fileActions.contentLoading ||
                    save.isSaving ||
                    fileActions.moveLoading
                  }
                >
                  <Upload size={16} />
                  <span>{t('header.publish')}</span>
                </Button>
              </>
            ) : null}
            <VersionDropdown
              items={versionItems}
              disabledKeys={disabledVersionKeys}
              formatVersion={SkillServicesMap.formatVersion}
              onSelect={navigation.handleVersionSelect}
            />
          </div>
        ) : undefined,
      },
    },
  } satisfies ResourceHostLayoutConfig;
  const layoutConfigDeps = [
    canEdit,
    canPreviewSelectedFile,
    workspace.state.configDescription,
    workspace.state.configName,
    workspace.state.editing,
    save.hasSaveableChanges,
    headerSaveStatusText,
    save.isSaving,
    fileActions.moveLoading,
    navigation.publishLoading,
    resourceId,
    save.savePhase,
    resource.skill,
    t,
    workspace.state.viewingVersion,
  ];
  const configTreeNodes = [
    {
      key: SKILL_CONFIG_NODE_ID,
      draggable: false,
      isLeaf: true,
      title: (
        <span className={styles.configTreeNode}>
          <span className={styles.configTreeTitle}>
            <span className={styles.configTreeIcon} aria-hidden="true">
              <Settings size={14} />
            </span>
            <span className={styles.configTreeName}>{t('config.title')}</span>
          </span>
          <span className={styles.configTreeBadge}>{t(`config.badge.${configBadge}`)}</span>
        </span>
      ),
    },
  ] satisfies DataNode[];

  if (resource.error) {
    return (
      <ResourceLayoutConfig
        className={styles.pageWrap}
        config={headerConfig}
        deps={layoutConfigDeps}
      >
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title={t('page.openFailed')}
            subTitle={parseErrorMessage(resource.error)}
            extra={
              <Link to="/app/drive/personal">
                <Button variant="secondary">{t('page.backToDrive')}</Button>
              </Link>
            }
          />
        </div>
      </ResourceLayoutConfig>
    );
  }

  if (resource.loading && !resource.skill) {
    return (
      <ResourceLayoutConfig
        className={styles.pageWrap}
        config={headerConfig}
        deps={layoutConfigDeps}
      >
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span>{t('page.loading')}</span>
          </div>
        </div>
      </ResourceLayoutConfig>
    );
  }

  return (
    <ResourceLayoutConfig className={styles.pageWrap} config={headerConfig} deps={layoutConfigDeps}>
      <div className={styles.page}>
        <div className={styles.mainArea}>
          {resource.skill ? (
            <div className={styles.contentRow}>
              <div className={styles.middlePanelSlot}>
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
                    className={`${styles.treeWrap} ${
                      fileActions.isTreeDragOver ? styles.treeWrapDragOver : ''
                    }`}
                    onDragOver={fileActions.handleTreeDragOver}
                    onDragLeave={fileActions.handleTreeDragLeave}
                    onDrop={fileActions.handleTreeDrop}
                    onClick={fileActions.handleTreeWrapClick}
                  >
                    {fileActions.canEditTree && fileActions.isTreeDragOver ? (
                      <div className={styles.treeDropHint}>{t('fileTree.dropHint')}</div>
                    ) : null}
                    <SkillFileTree
                      files={workspace.state.files}
                      prependNodes={configTreeNodes}
                      selectedFileId={workspace.state.selectedFileId}
                      selectedNodeId={workspace.state.selectedTreeNodeId}
                      expandedKeys={fileActions.expandedKeys}
                      pendingCreate={fileActions.pendingCreate}
                      dirtyNodeIds={workspace.dirtyNodeIds}
                      isOwner={fileActions.canEditTree}
                      onSelect={handleTreeSelect}
                      onCommitCreate={fileActions.handleCommitCreate}
                      onCancelCreate={fileActions.cancelPendingCreate}
                      onDeleteFile={fileActions.handleDeleteFile}
                      onMoveFile={fileActions.handleMoveFile}
                    />
                    {workspace.state.files.length === 0 && !fileActions.pendingCreate ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t(canEdit ? 'fileTree.emptyEditable' : 'fileTree.empty')}
                        className={styles.emptyBlock}
                      />
                    ) : null}
                  </div>
                  <SkillSaveQueueDock items={save.visibleQueueItems} onRetry={save.handleSaveAll} />
                </section>
              </div>

              <div className={styles.rightPanelSlot}>
                <main className={styles.rightPanel}>
                  {isConfigSelected ? (
                    <SkillConfigPanel
                      name={workspace.state.configName}
                      description={workspace.state.configDescription}
                      canEdit={canEdit}
                      isDirty={workspace.isConfigDirty}
                      isLoading={save.configSaveLoading}
                      onNameChange={workspace.updateConfigName}
                      onDescriptionChange={workspace.updateConfigDescription}
                      onReset={workspace.resetConfig}
                      onSave={() => void save.saveConfig().catch(() => undefined)}
                    />
                  ) : selectedFile ? (
                    <>
                      <header className={styles.editorHeader}>
                        <span className={styles.editorFileName}>{selectedFile.name}</span>
                        {isMarkdownSkillFile(selectedFile) ? (
                          <Tabs
                            className={styles.editorTabs}
                            selectedKey={selectedMarkdownView}
                            onSelectionChange={(key) => handleMarkdownViewChange(String(key))}
                          >
                            <Tabs.ListContainer>
                              <Tabs.List
                                className={styles.editorTabsList}
                                aria-label={t('preview.markdownMode')}
                              >
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
                            onScroll={(event) => handleMarkdownPreviewScroll(event.currentTarget)}
                          >
                            <div className={styles.markdownPreviewContent}>
                              <Markdown
                                content={workspace.activeContent}
                                resourceResolver={markdownResourceResolver}
                              />
                            </div>
                          </div>
                        ) : canPreviewSkillFile(selectedFile) ? (
                          <SkillEditor
                            content={workspace.activeContent}
                            fileName={selectedFile.name}
                            modelPath={`skill://${encodeURIComponent(resourceId)}/${encodeURIComponent(
                              workspace.activeEditorKey
                            )}/${encodeURIComponent(selectedFile.name)}`}
                            readOnly={
                              !workspace.state.editing ||
                              !canEdit ||
                              fileActions.contentLoading ||
                              navigation.versionLoading
                            }
                            onSave={handleEditorSave}
                            onChange={(content) =>
                              workspace.updateFileContent(selectedFile.id, content)
                            }
                            onEditorMount={handleMarkdownEditorMount}
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
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('preview.selectFile')}
                      className={styles.emptyBlock}
                    />
                  )}
                </main>
              </div>
            </div>
          ) : (
            <div className={styles.middleOverlay}>
              <ResultState status="warning" title={t('page.openFailed')} />
            </div>
          )}
        </div>
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={!!fileActions.deleteTarget}
        onOpenChange={() => fileActions.setDeleteTarget(null)}
        title={t(
          fileActions.deleteTarget?.kind === 'folder' ? 'delete.folderTitle' : 'delete.fileTitle'
        )}
        description={
          fileActions.deleteDirtyCount > 0
            ? t(
                fileActions.deleteTarget?.kind === 'folder'
                  ? 'delete.dirtyFolderDescription'
                  : 'delete.dirtyFileDescription',
                {
                  name: fileActions.deleteTarget?.name,
                  count: fileActions.deleteDirtyCount,
                }
              )
            : fileActions.deleteTarget?.kind === 'folder'
              ? t('delete.folderDescription', { name: fileActions.deleteTarget?.name })
              : t('delete.fileDescription', { name: fileActions.deleteTarget?.name })
        }
        confirmText={t('delete.confirm')}
        onConfirm={fileActions.handleConfirmDelete}
        isConfirmLoading={fileActions.deleteLoading}
        isDismissable={!fileActions.deleteLoading}
      />

      <AppAlertDialog
        type="confirm"
        isOpen={fileActions.pendingMove != null}
        onOpenChange={(open) => {
          if (!open) fileActions.setPendingMove(null);
        }}
        title={t('move.dirtyTitle')}
        description={t('move.dirtyDescription')}
        confirmText={t('move.confirm')}
        onConfirm={fileActions.handleConfirmMove}
        isConfirmLoading={fileActions.moveLoading}
        isDismissable={!fileActions.moveLoading}
      />

      <UnsavedSkillChangesModal
        isOpen={navigation.pendingIntentMode != null}
        mode={navigation.pendingIntentMode ?? 'leave'}
        isLoading={navigation.pendingIntentLoading}
        onCancel={navigation.handleCancelPendingIntent}
        onDiscard={navigation.handleDiscardPendingIntent}
        onConfirm={navigation.handleConfirmPendingIntent}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void fileActions.handleFileChange(event)}
      />
    </ResourceLayoutConfig>
  );
}

export default SkillView;
