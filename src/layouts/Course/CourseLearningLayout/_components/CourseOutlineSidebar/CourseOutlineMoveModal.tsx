import { BookOpen, BookOpenText, BookText, NotebookText } from 'lucide-react';
import { type Key, useState } from 'react';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import Tree, { type DataNode } from '@/components/base/Tree';
import type { CourseOutlineNode } from '@/domains/Course';

import styles from '../../style.module.less';

interface CourseOutlineMoveModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  nodes: CourseOutlineNode[];
  currentParentId?: string;
  isSubmitting: boolean;
  confirmText: string;
  cancelText: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetNodeId: string) => void;
}

const toTargetTreeData = (nodes: CourseOutlineNode[], currentParentId?: string): DataNode[] =>
  nodes.flatMap((node) => {
    if (node.nodeType === 'RESOURCE') return [];
    const title = (
      <span className={styles.outlineMoveNodeTitle}>
        <span className={styles.outlineMoveNodeIcon} aria-hidden>
          {node.nodeType === 'CHAPTER' ? (
            <>
              <BookText size={15} className={styles.outlineCollapsedIcon} />
              <BookOpen size={15} className={styles.outlineExpandedIcon} />
            </>
          ) : (
            <>
              <NotebookText size={15} className={styles.outlineCollapsedIcon} />
              <BookOpenText size={15} className={styles.outlineExpandedIcon} />
            </>
          )}
        </span>
        <span>{node.title}</span>
      </span>
    );
    return [
      {
        key: node.nodeId,
        title,
        disabled: node.nodeId === currentParentId,
        children: toTargetTreeData(node.children, currentParentId),
      },
    ];
  });

function CourseOutlineMoveModal(props: CourseOutlineMoveModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>();

  const handleOpenChange = (open: boolean) => {
    if (!open && props.isSubmitting) return;
    if (!open) setSelectedTargetId(undefined);
    props.onOpenChange(open);
  };

  return (
    <AppModal
      isOpen={props.isOpen}
      onOpenChange={handleOpenChange}
      title={props.title}
      size="md"
      isDismissable={!props.isSubmitting}
      actions={
        <>
          <AppButton
            variant="secondary"
            isDisabled={props.isSubmitting}
            onPress={() => handleOpenChange(false)}
          >
            {props.cancelText}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={props.isSubmitting || !selectedTargetId}
            aria-busy={props.isSubmitting || undefined}
            onPress={() => {
              if (selectedTargetId) props.onConfirm(selectedTargetId);
            }}
          >
            {props.confirmText}
          </AppButton>
        </>
      }
    >
      <div className={styles.outlineMoveModalBody}>
        <p>{props.hint}</p>
        <div className={styles.outlineMoveTree}>
          <Tree
            blockNode
            defaultExpandAll
            treeData={toTargetTreeData(props.nodes, props.currentParentId)}
            selectedKeys={selectedTargetId ? [selectedTargetId] : []}
            onSelect={(keys: Key[]) => setSelectedTargetId(keys[0] ? String(keys[0]) : undefined)}
          />
        </div>
      </div>
    </AppModal>
  );
}

export default CourseOutlineMoveModal;
