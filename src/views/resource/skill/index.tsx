import { toast } from '@heroui/react';
import { Pencil, Save, Settings, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import type { DataNode } from '@/components/base/Tree';
import VersionDropdown from '@/components/business/VersionDropdown';
import { SkillServicesMap } from '@/domains/Skill';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import type { ResourceHostLayoutConfig } from '@/views/resource/ResourceHostContext';

import ResourceLayoutConfig from '../_components/ResourceLayoutConfig';
import SkillActionDialogs from './_components/SkillActionDialogs';
import SkillEditorPanel from './_components/SkillEditorPanel';
import SkillFileTreePanel from './_components/SkillFileTreePanel';
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

interface SkillViewProps {
  resourceId: string;
}

function SkillView({ resourceId }: SkillViewProps) {
  const { t } = useTranslation('skill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resource = useSkillResourceController(resourceId);
  const workspace = useSkillWorkspaceDraftController(resource.skill);
  const canEdit = canEditSkill(resource.skill, workspace.state.viewingVersion, resource.isOwner);
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
    isOwner: resource.isOwner,
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
  const disabledVersionKeys = getDisabledSkillVersionKeys(resource.isOwner, versionItems);
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
        resourceInfo: resource.skill?.resourceInfo,
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
                <AppButton
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
                </AppButton>
                {workspace.state.editing || save.hasSaveableChanges ? (
                  <AppButton
                    variant="secondary"
                    onPress={save.handleSaveAll}
                    isDisabled={
                      !save.hasSaveableChanges || save.isSaving || fileActions.moveLoading
                    }
                  >
                    <Save size={16} />
                    <span>{t('header.save')}</span>
                  </AppButton>
                ) : null}
                <VersionDropdown
                  items={versionItems}
                  disabledKeys={disabledVersionKeys}
                  formatVersion={SkillServicesMap.formatVersion}
                  onSelect={navigation.handleVersionSelect}
                />
                <AppButton
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
                </AppButton>
              </>
            ) : null}
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
              <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                <AppButton variant="secondary">{t('page.backToDrive')}</AppButton>
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
                <SkillFileTreePanel
                  canEdit={canEdit}
                  configTreeNodes={configTreeNodes}
                  dirtyNodeIds={workspace.dirtyNodeIds}
                  fileActions={fileActions}
                  fileInputRef={fileInputRef}
                  files={workspace.state.files}
                  onTreeSelect={handleTreeSelect}
                  saveQueueItems={save.visibleQueueItems}
                  selectedFileId={workspace.state.selectedFileId}
                  selectedTreeNodeId={workspace.state.selectedTreeNodeId}
                  t={t}
                  onRetrySave={save.handleSaveAll}
                />
              </div>

              <div className={styles.rightPanelSlot}>
                <main className={styles.rightPanel}>
                  <SkillEditorPanel
                    activeContent={workspace.activeContent}
                    activeEditorKey={workspace.activeEditorKey}
                    canEdit={canEdit}
                    configDescription={workspace.state.configDescription}
                    configName={workspace.state.configName}
                    configSaveLoading={save.configSaveLoading}
                    contentLoading={fileActions.contentLoading}
                    isConfigDirty={workspace.isConfigDirty}
                    isConfigSelected={isConfigSelected}
                    isEditing={workspace.state.editing}
                    markdownPreviewRef={markdownPreviewRef}
                    markdownResourceResolver={markdownResourceResolver}
                    navigationVersionLoading={navigation.versionLoading}
                    resourceId={resourceId}
                    selectedFile={selectedFile}
                    selectedMarkdownView={selectedMarkdownView}
                    t={t}
                    onConfigDescriptionChange={workspace.updateConfigDescription}
                    onConfigNameChange={workspace.updateConfigName}
                    onConfigReset={workspace.resetConfig}
                    onConfigSave={() => void save.saveConfig().catch(() => undefined)}
                    onEditorMount={handleMarkdownEditorMount}
                    onEditorSave={handleEditorSave}
                    onFileContentChange={workspace.updateFileContent}
                    onMarkdownPreviewScroll={handleMarkdownPreviewScroll}
                    onMarkdownViewChange={handleMarkdownViewChange}
                  />
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

      <SkillActionDialogs fileActions={fileActions} navigation={navigation} t={t} />

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
