import { ArrowLeft, CheckCircle2, Circle, LoaderCircle, Plus, Search } from 'lucide-react';
import type { Key, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { Spin } from '@/components/base/Feedback';
import { FormField, Input } from '@/components/base/Input';
import Tree, {
  type DataNode,
  type TreeAllowDropInfo,
  type TreeDropInfo,
} from '@/components/base/Tree';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppFormDialog from '@/components/business/AppFormDialog';
import { UploadDocumentModal } from '@/components/business/Drive/Modals';
import type { CourseOutlineContainerNode, CourseOutlineNode } from '@/domains/Course';
import ResourceShellHeader from '@/layouts/Resource/ResourceShellHeader';
import { parseErrorMessage } from '@/utils/error';

import { type CourseOutlineResourcePageState, findOutlineNode } from '../../model';
import styles from '../../style.module.less';
import CourseOutlineMoveModal from './CourseOutlineMoveModal';
import CourseOutlineNodeTitle from './CourseOutlineNodeTitle';
import CourseResourcePickerModal from './CourseResourcePickerModal';
import {
  type CourseOutlineResourceTarget,
  findCourseOutlineResourceTarget,
  resolveCourseOutlineResourceDrop,
} from './model';
import { useCourseOutlineEditingController } from './useCourseOutlineEditingController';

interface CourseOutlineSidebarProps {
  courseId: string;
  courseName: string;
  editable: boolean;
  nodes: CourseOutlineNode[];
  allNodes: CourseOutlineNode[];
  selectedNodeId?: string;
  searchQuery: string;
  expandSearchResults: boolean;
  loading: boolean;
  error?: Error;
  resourcePageStateMap: Map<string, CourseOutlineResourcePageState>;
  onSearchQueryChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenCourseHome: () => void;
  onExpandNode: (nodeId: string) => void;
  onLoadMoreResources: (nodeId: string) => void;
  onRefresh: () => void;
  onRetry: () => void;
}

interface CourseOutlineTreeActions {
  canMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => boolean;
  onCreateChild: (node: CourseOutlineContainerNode) => void;
  onMountFromDrive: (node: CourseOutlineContainerNode) => void;
  onUploadLocal: (node: CourseOutlineContainerNode) => void;
  onRename: (node: CourseOutlineContainerNode) => void;
  onMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => void;
  onDelete: (node: CourseOutlineContainerNode) => void;
  onMoveResource: (target: CourseOutlineResourceTarget) => void;
  onRemoveResource: (target: CourseOutlineResourceTarget) => void;
  onLoadMoreResources: (nodeId: string) => void;
}

interface CourseOutlineResourcePageTitleProps {
  state: CourseOutlineResourcePageState;
  onLoadMore: () => void;
}

function CourseOutlineResourcePageTitle({
  state,
  onLoadMore,
}: CourseOutlineResourcePageTitleProps) {
  const { t } = useTranslation('course');
  return (
    <button
      type="button"
      className={styles.outlineLoadMore}
      disabled={state.loading}
      onClick={(event) => {
        event.stopPropagation();
        if (!state.loading) onLoadMore();
      }}
    >
      {state.loading ? <LoaderCircle size={14} className={styles.outlineLoadingIcon} /> : null}
      <span>
        {state.loading
          ? t('outline.loadingResources')
          : t('outline.loadMoreResources', {
              loaded: state.loadedCount,
              total: state.total,
            })}
      </span>
    </button>
  );
}

const toTreeData = (
  nodes: CourseOutlineNode[],
  editable: boolean,
  actions: CourseOutlineTreeActions,
  resourcePageStateMap: Map<string, CourseOutlineResourcePageState>,
  parentId?: string
): DataNode[] =>
  nodes.map((node) => {
    const readIndicator =
      node.nodeType === 'RESOURCE' ? (
        node.read ? (
          <CheckCircle2 size={14} className={styles.readIcon} aria-label="read" />
        ) : (
          <Circle size={13} className={styles.unreadIcon} aria-label="unread" />
        )
      ) : undefined;
    const title = (
      <CourseOutlineNodeTitle
        node={node}
        parentId={parentId}
        editable={editable}
        readIndicator={readIndicator}
        canMoveContainer={actions.canMoveContainer}
        onCreateChild={actions.onCreateChild}
        onMountFromDrive={actions.onMountFromDrive}
        onUploadLocal={actions.onUploadLocal}
        onRename={actions.onRename}
        onMoveContainer={actions.onMoveContainer}
        onDelete={actions.onDelete}
        onMoveResource={actions.onMoveResource}
        onRemoveResource={actions.onRemoveResource}
      />
    );

    if (node.nodeType === 'RESOURCE') {
      return {
        key: node.nodeId,
        isLeaf: true,
        draggable: editable,
        title,
      };
    }
    return {
      key: node.nodeId,
      isLeaf: false,
      draggable: false,
      title,
      children: [
        ...toTreeData(node.children, editable, actions, resourcePageStateMap, node.nodeId),
        ...(resourcePageStateMap.get(node.nodeId)?.loading ||
        resourcePageStateMap.get(node.nodeId)?.nextCursor
          ? [
              {
                key: `course-outline-resource-page:${node.nodeId}`,
                isLeaf: true,
                selectable: false,
                draggable: false,
                title: (
                  <CourseOutlineResourcePageTitle
                    state={resourcePageStateMap.get(node.nodeId)!}
                    onLoadMore={() => actions.onLoadMoreResources(node.nodeId)}
                  />
                ),
              },
            ]
          : []),
      ],
    };
  });

function CourseOutlineSidebar(props: CourseOutlineSidebarProps) {
  const { t } = useTranslation('course');
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const editor = useCourseOutlineEditingController({
    courseId: props.courseId,
    nodes: props.allNodes,
    onMutated: props.onRefresh,
  });
  const treeActions: CourseOutlineTreeActions = {
    canMoveContainer: editor.sectionReorder.canMove,
    onCreateChild: (node) => editor.sectionDialog.openCreate(node.nodeId),
    onMountFromDrive: editor.cloudMount.open,
    onUploadLocal: editor.localUpload.open,
    onRename: editor.sectionDialog.openRename,
    onMoveContainer: editor.sectionReorder.move,
    onDelete: editor.sectionDeletion.open,
    onMoveResource: editor.resourceMovement.open,
    onRemoveResource: editor.resourceRemoval.open,
    onLoadMoreResources: props.onLoadMoreResources,
  };

  const allowTreeDrop = ({ dragNode, dropNode, dropPosition }: TreeAllowDropInfo) => {
    if (!props.editable || editor.resourceMovement.loading) {
      return false;
    }
    const resourceTarget = findCourseOutlineResourceTarget(props.allNodes, String(dragNode.key));
    const targetNode = findOutlineNode(props.allNodes, String(dropNode.key));
    return Boolean(
      resourceTarget &&
      targetNode &&
      resolveCourseOutlineResourceDrop(
        props.allNodes,
        resourceTarget,
        String(dropNode.key),
        dropPosition
      )
    );
  };

  const handleTreeDrop = ({ dragNode, dropNode, dropPosition }: TreeDropInfo) => {
    if (!allowTreeDrop({ dragNode, dropNode, dropPosition })) return;
    const resourceTarget = findCourseOutlineResourceTarget(props.allNodes, String(dragNode.key));
    if (!resourceTarget) return;
    const move = resolveCourseOutlineResourceDrop(
      props.allNodes,
      resourceTarget,
      String(dropNode.key),
      dropPosition
    );
    if (!move) return;
    editor.resourceMovement.moveToPosition({ target: resourceTarget, ...move });
  };

  const handleCreateChapter = () => {
    const name = chapterName.trim();
    if (!name || editor.chapterCreation.loading) return;
    void editor.chapterCreation
      .submit(name)
      .then(() => {
        setChapterName('');
        setIsCreatingChapter(false);
      })
      .catch(() => undefined);
  };

  const handleChapterInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setChapterName('');
      setIsCreatingChapter(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateChapter();
    }
  };

  const isEmpty = !props.loading && !props.error && props.nodes.length === 0;
  const createChapterRow = props.editable ? (
    <div className={styles.outlineCreateRow}>
      {isCreatingChapter ? (
        <div className={styles.outlineCreateTreeRow} data-editing="true">
          <span className={styles.outlineCreateIndent} aria-hidden />
          <Plus size={16} className={styles.outlineCreateIcon} aria-hidden />
          <Input
            autoFocus
            className={styles.outlineCreateInput}
            aria-label={t('editor.outline.createChapter')}
            placeholder={t('editor.outline.createChapter')}
            value={chapterName}
            disabled={editor.chapterCreation.loading}
            onChange={(event) => setChapterName(event.target.value)}
            onKeyDown={handleChapterInputKeyDown}
            onBlur={() => {
              if (editor.chapterCreation.loading) return;
              setChapterName('');
              setIsCreatingChapter(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className={styles.outlineCreateTreeRow}
          onClick={() => setIsCreatingChapter(true)}
        >
          <span className={styles.outlineCreateIndent} aria-hidden />
          <Plus size={16} className={styles.outlineCreateIcon} aria-hidden />
          <span className={styles.outlineCreateLabel}>{t('editor.outline.createChapter')}</span>
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      <aside className={styles.outlineSidebar}>
        <ResourceShellHeader
          className={styles.outlineHeader}
          inlineTitle={
            <span className={styles.courseRow}>
              <AppIconButton
                icon={<ArrowLeft size={18} aria-hidden />}
                label={t('nav.home')}
                onPress={props.onOpenCourseHome}
              />
              <strong>{props.courseName}</strong>
            </span>
          }
        />

        <div className={styles.outlineTools}>
          <div className={styles.outlineSearch}>
            <Search size={17} aria-hidden />
            <Input
              aria-label={t('outline.searchPlaceholder')}
              placeholder={t('outline.searchPlaceholder')}
              value={props.searchQuery}
              onChange={(event) => props.onSearchQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.outlineTree}>
          {props.loading ? <Spin tip={t('sidebar.loading')} /> : null}
          {props.error ? (
            <div className={styles.outlineState}>
              <span>{parseErrorMessage(props.error)}</span>
              <AppButton variant="secondary" size="sm" onPress={props.onRetry}>
                {t('common.retry')}
              </AppButton>
            </div>
          ) : null}
          {isEmpty ? createChapterRow : null}
          {props.nodes.length > 0 ? (
            <Tree
              blockNode
              className={styles.outlineTreeControl}
              treeData={toTreeData(
                props.nodes,
                props.editable,
                treeActions,
                props.resourcePageStateMap
              )}
              draggable={props.editable && !editor.resourceMovement.loading}
              allowDrop={allowTreeDrop}
              onDrop={handleTreeDrop}
              selectedKeys={props.selectedNodeId ? [props.selectedNodeId] : []}
              defaultExpandAll={props.expandSearchResults}
              onExpand={(_keys, info) => {
                if (info.expanded) props.onExpandNode(String(info.node.key));
              }}
              onSelect={(_keys: Key[], info: { node: DataNode }) =>
                props.onSelectNode(String(info.node.key))
              }
            />
          ) : null}
          {!isEmpty ? createChapterRow : null}
        </div>
      </aside>

      {props.editable ? (
        <>
          <AppFormDialog
            isOpen={editor.sectionDialog.value !== null}
            onOpenChange={(open) => {
              if (!open) editor.sectionDialog.close();
            }}
            title={
              editor.sectionDialog.value?.type === 'rename'
                ? t('editor.outline.renameTitle')
                : t('editor.outline.createTitle')
            }
            confirmText={t('editor.actions.confirm')}
            isSubmitting={editor.sectionDialog.loading}
            isSubmitDisabled={!editor.sectionDialog.name.trim()}
            onSubmit={editor.sectionDialog.submit}
          >
            <FormField
              label={t('editor.outline.name')}
              value={editor.sectionDialog.name}
              onChange={editor.sectionDialog.setName}
              isRequired
            >
              <Input autoFocus />
            </FormField>
          </AppFormDialog>

          <AppAlertDialog
            type="danger"
            isOpen={editor.sectionDeletion.target !== undefined}
            onOpenChange={(open) => {
              if (!open) editor.sectionDeletion.close();
            }}
            title={t('editor.outline.deleteTitle')}
            description={t('editor.outline.deleteDescription', {
              name: editor.sectionDeletion.target?.title ?? '',
            })}
            confirmText={t('editor.actions.delete')}
            isConfirmLoading={editor.sectionDeletion.loading}
            onConfirm={editor.sectionDeletion.confirm}
          />

          {editor.cloudMount.target ? (
            <CourseResourcePickerModal
              isOpen
              courseId={props.courseId}
              targetNodeId={editor.cloudMount.target.nodeId}
              targetName={editor.cloudMount.target.title}
              onOpenChange={(open) => {
                if (!open) editor.cloudMount.close();
              }}
              onSuccess={props.onRefresh}
            />
          ) : null}

          {editor.localUpload.target ? (
            <UploadDocumentModal
              isOpen
              pathTagId={editor.localUpload.target.nodeId}
              description={t('editor.outline.localUploadDescription')}
              onOpenChange={(open) => {
                if (!open) editor.localUpload.close();
              }}
              onSuccess={props.onRefresh}
            />
          ) : null}

          <CourseOutlineMoveModal
            isOpen={editor.resourceMovement.target !== undefined}
            title={t('editor.outline.moveResourceTitle')}
            hint={t('editor.outline.moveResourceHint', {
              name: editor.resourceMovement.target?.node.title ?? '',
            })}
            nodes={props.allNodes}
            currentParentId={editor.resourceMovement.target?.parentId}
            isSubmitting={editor.resourceMovement.loading}
            confirmText={t('editor.actions.confirm')}
            cancelText={t('editor.actions.cancel')}
            onOpenChange={(open) => {
              if (!open) editor.resourceMovement.close();
            }}
            onConfirm={editor.resourceMovement.confirm}
          />

          <AppAlertDialog
            type="danger"
            isOpen={editor.resourceRemoval.target !== undefined}
            onOpenChange={(open) => {
              if (!open) editor.resourceRemoval.close();
            }}
            title={t('editor.outline.removeResourceTitle')}
            description={t('editor.outline.removeResourceDescription', {
              name: editor.resourceRemoval.target?.node.title ?? '',
            })}
            confirmText={t('editor.outline.removeResource')}
            isConfirmLoading={editor.resourceRemoval.loading}
            onConfirm={editor.resourceRemoval.confirm}
          />
        </>
      ) : null}
    </>
  );
}

export default CourseOutlineSidebar;
