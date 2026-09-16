import { Dropdown, Label } from '@heroui/react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  BookOpenText,
  BookText,
  CloudUpload,
  Ellipsis,
  FolderInput,
  FolderPlus,
  NotebookText,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import type { CourseOutlineNode } from '@/domains/Course';

import styles from '../../style.module.less';
import CourseResourceIcon from '../CourseResourceIcon';
import type { CourseOutlineContainerNode, CourseOutlineResourceTarget } from './model';

interface CourseOutlineNodeTitleProps {
  node: CourseOutlineNode;
  parentId?: string;
  editable: boolean;
  readIndicator?: ReactNode;
  canMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => boolean;
  onCreateChild: (node: CourseOutlineContainerNode) => void;
  onMountFromDrive: (node: CourseOutlineContainerNode) => void;
  onUploadLocal: (node: CourseOutlineContainerNode) => void;
  onRename: (node: CourseOutlineContainerNode) => void;
  onMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => void;
  onDelete: (node: CourseOutlineContainerNode) => void;
  onMoveResource: (target: CourseOutlineResourceTarget) => void;
  onRemoveResource: (target: CourseOutlineResourceTarget) => void;
}

function stopTreeAction(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  event.stopPropagation();
}

function CourseOutlineNodeTitle({
  node,
  parentId,
  editable,
  readIndicator,
  canMoveContainer,
  onCreateChild,
  onMountFromDrive,
  onUploadLocal,
  onRename,
  onMoveContainer,
  onDelete,
  onMoveResource,
  onRemoveResource,
}: CourseOutlineNodeTitleProps) {
  const { t } = useTranslation('course');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const isResource = node.nodeType === 'RESOURCE';

  const closeAndRun = (action: () => void) => {
    setCreateMenuOpen(false);
    setMoreMenuOpen(false);
    action();
  };

  return (
    <span
      className={styles.outlineNodeTitle}
      data-editable={editable || undefined}
      data-resource={isResource || undefined}
    >
      <span className={styles.outlineNodeMain}>
        {isResource ? (
          <CourseResourceIcon node={node} size={15} />
        ) : node.nodeType === 'CHAPTER' ? (
          <span className={styles.outlineContainerIcon} aria-hidden>
            <BookText size={15} className={styles.outlineCollapsedIcon} />
            <BookOpen size={15} className={styles.outlineExpandedIcon} />
          </span>
        ) : (
          <span className={styles.outlineContainerIcon} aria-hidden>
            <NotebookText size={15} className={styles.outlineCollapsedIcon} />
            <BookOpenText size={15} className={styles.outlineExpandedIcon} />
          </span>
        )}
        <span className={styles.outlineNodeLabel} title={node.title}>
          {node.title}
        </span>
        {!editable ? readIndicator : null}
      </span>

      {editable ? (
        <span
          className={styles.outlineNodeActions}
          onClick={stopTreeAction}
          onKeyDown={stopTreeAction}
        >
          {!isResource ? (
            <>
              <Dropdown isOpen={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                <AppIconButton
                  icon={<Plus size={14} aria-hidden />}
                  label={t('editor.outline.createIn', { name: node.title })}
                  size="sm"
                  className={styles.outlineNodeActionButton}
                  tooltip={{ content: t('editor.outline.addContent') }}
                  overlayTrigger={<Dropdown.Trigger />}
                />
                <Dropdown.Popover className={styles.outlineActionMenu} placement="right">
                  <Dropdown.Menu aria-label={t('editor.outline.addContent')}>
                    <Dropdown.Item
                      id="create-section"
                      textValue={t('editor.outline.createSection')}
                      onAction={() => closeAndRun(() => onCreateChild(node))}
                    >
                      <FolderPlus size={15} aria-hidden />
                      <Label>{t('editor.outline.createSection')}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="mount-from-drive"
                      textValue={t('editor.outline.uploadDrive')}
                      onAction={() => closeAndRun(() => onMountFromDrive(node))}
                    >
                      <CloudUpload size={15} aria-hidden />
                      <Label>{t('editor.outline.uploadDrive')}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="upload-local"
                      textValue={t('editor.outline.uploadLocal')}
                      onAction={() => closeAndRun(() => onUploadLocal(node))}
                    >
                      <Upload size={15} aria-hidden />
                      <Label>{t('editor.outline.uploadLocal')}</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              <AppIconButton
                icon={<Pencil size={14} aria-hidden />}
                label={t('editor.outline.renameNode', { name: node.title })}
                size="sm"
                className={styles.outlineNodeActionButton}
                tooltip={{ content: t('editor.actions.rename') }}
                onClick={() => onRename(node)}
              />
            </>
          ) : null}

          <Dropdown isOpen={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <AppIconButton
              icon={<Ellipsis size={14} aria-hidden />}
              label={t('editor.outline.moreActions', { name: node.title })}
              size="sm"
              className={styles.outlineNodeActionButton}
              tooltip={{ content: t('editor.outline.moreActionsLabel') }}
              overlayTrigger={<Dropdown.Trigger />}
            />
            <Dropdown.Popover className={styles.outlineActionMenu} placement="right">
              <Dropdown.Menu aria-label={t('editor.outline.moreActionsLabel')}>
                {isResource && parentId ? (
                  <>
                    <Dropdown.Item
                      id="move-resource"
                      textValue={t('editor.outline.moveResource')}
                      onAction={() => closeAndRun(() => onMoveResource({ node, parentId }))}
                    >
                      <FolderInput size={15} aria-hidden />
                      <Label>{t('editor.outline.moveResource')}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="remove-resource"
                      textValue={t('editor.outline.removeResource')}
                      variant="danger"
                      onAction={() => closeAndRun(() => onRemoveResource({ node, parentId }))}
                    >
                      <Trash2 size={15} aria-hidden />
                      <Label>{t('editor.outline.removeResource')}</Label>
                    </Dropdown.Item>
                  </>
                ) : null}
                {!isResource ? (
                  <>
                    {canMoveContainer(node, -1) ? (
                      <Dropdown.Item
                        id="move-up"
                        textValue={t('editor.actions.moveUp')}
                        onAction={() => closeAndRun(() => onMoveContainer(node, -1))}
                      >
                        <ArrowUp size={15} aria-hidden />
                        <Label>{t('editor.actions.moveUp')}</Label>
                      </Dropdown.Item>
                    ) : null}
                    {canMoveContainer(node, 1) ? (
                      <Dropdown.Item
                        id="move-down"
                        textValue={t('editor.actions.moveDown')}
                        onAction={() => closeAndRun(() => onMoveContainer(node, 1))}
                      >
                        <ArrowDown size={15} aria-hidden />
                        <Label>{t('editor.actions.moveDown')}</Label>
                      </Dropdown.Item>
                    ) : null}
                    <Dropdown.Item
                      id="delete"
                      textValue={t('editor.actions.delete')}
                      variant="danger"
                      onAction={() => closeAndRun(() => onDelete(node))}
                    >
                      <Trash2 size={15} aria-hidden />
                      <Label>{t('editor.actions.delete')}</Label>
                    </Dropdown.Item>
                  </>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </span>
      ) : null}
    </span>
  );
}

export default CourseOutlineNodeTitle;
