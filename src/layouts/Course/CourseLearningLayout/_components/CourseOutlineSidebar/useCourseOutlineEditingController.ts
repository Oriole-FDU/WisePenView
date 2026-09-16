import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCourseService } from '@/domains';
import type { CourseOutlineNode } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';

import {
  type CourseOutlineContainerNode,
  type CourseOutlineResourceTarget,
  findCourseOutlineContainerSiblings,
} from './model';

type SectionDialog =
  { type: 'create'; parentId?: string } | { type: 'rename'; nodeId: string } | null;

interface UseCourseOutlineEditingControllerOptions {
  courseId: string;
  nodes: CourseOutlineNode[];
  onMutated: () => void;
}

export const useCourseOutlineEditingController = ({
  courseId,
  nodes,
  onMutated,
}: UseCourseOutlineEditingControllerOptions) => {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const [sectionDialog, setSectionDialog] = useState<SectionDialog>(null);
  const [sectionName, setSectionName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CourseOutlineContainerNode>();
  const [cloudTarget, setCloudTarget] = useState<CourseOutlineContainerNode>();
  const [localTarget, setLocalTarget] = useState<CourseOutlineContainerNode>();
  const [moveTarget, setMoveTarget] = useState<CourseOutlineResourceTarget>();
  const [removeTarget, setRemoveTarget] = useState<CourseOutlineResourceTarget>();

  const createChapterRequest = useApi(
    async (name: string) => {
      const normalizedName = name.trim();
      if (!normalizedName) return;
      await courseService.createCourseOutlineSection({
        courseId,
        name: normalizedName,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onMutated();
        toast.success(t('editor.outline.saved'));
      },
    }
  );

  const saveSectionRequest = useApi(
    async () => {
      const name = sectionName.trim();
      if (!sectionDialog || !name) return;
      if (sectionDialog.type === 'create') {
        await courseService.createCourseOutlineSection({
          courseId,
          parentId: sectionDialog.parentId,
          name,
        });
        return;
      }
      await courseService.renameCourseOutlineSection({
        courseId,
        nodeId: sectionDialog.nodeId,
        name,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setSectionDialog(null);
        setSectionName('');
        onMutated();
        toast.success(t('editor.outline.saved'));
      },
    }
  );

  const deleteSectionRequest = useApi(
    async () => {
      if (!deleteTarget) return;
      await courseService.deleteCourseOutlineSection({
        courseId,
        nodeId: deleteTarget.nodeId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setDeleteTarget(undefined);
        onMutated();
        toast.success(t('editor.outline.saved'));
      },
    }
  );

  const reorderRequest = useApi(
    async (node: CourseOutlineContainerNode, offset: -1 | 1) => {
      const siblings = findCourseOutlineContainerSiblings(nodes, node.nodeId);
      if (!siblings) return;
      const index = siblings.findIndex((item) => item.nodeId === node.nodeId);
      const targetIndex = index + offset;
      if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
      const orderedNodes = [...siblings];
      [orderedNodes[index], orderedNodes[targetIndex]] = [
        orderedNodes[targetIndex],
        orderedNodes[index],
      ];
      await courseService.reorderCourseOutlineSections({
        courseId,
        orderedNodeIds: orderedNodes.map((item) => item.nodeId),
      });
    },
    {
      manual: true,
      onSuccess: onMutated,
    }
  );

  const moveResourceRequest = useApi(
    async ({
      target,
      targetNodeId,
      orderedResourceIds,
    }: {
      target: CourseOutlineResourceTarget;
      targetNodeId: string;
      orderedResourceIds?: string[];
    }) => {
      await courseService.moveCourseOutlineResource({
        courseId,
        resourceId: target.node.resourceId,
        sourceNodeId: target.parentId,
        targetNodeId,
        orderedResourceIds,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setMoveTarget(undefined);
        onMutated();
        toast.success(t('editor.outline.saved'));
      },
      onErrorEffect: () => {
        onMutated();
      },
    }
  );

  const removeResourceRequest = useApi(
    async () => {
      if (!removeTarget) return;
      await courseService.removeCourseOutlineResource({
        courseId,
        resourceId: removeTarget.node.resourceId,
        sourceNodeId: removeTarget.parentId,
        mainTagId: removeTarget.node.mainTagId,
        currentTagIds: removeTarget.node.currentTagIds ?? [removeTarget.parentId],
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setRemoveTarget(undefined);
        onMutated();
        toast.success(t('editor.outline.saved'));
      },
    }
  );

  const openCreate = (parentId?: string) => {
    setSectionName('');
    setSectionDialog({ type: 'create', parentId });
  };

  const openRename = (node: CourseOutlineContainerNode) => {
    setSectionName(node.title);
    setSectionDialog({ type: 'rename', nodeId: node.nodeId });
  };

  const openDelete = (node: CourseOutlineContainerNode) => {
    setDeleteTarget(node);
  };

  const openCloudMount = (node: CourseOutlineContainerNode) => {
    setCloudTarget(node);
  };

  const openLocalUpload = (node: CourseOutlineContainerNode) => {
    setLocalTarget(node);
  };

  const openResourceMovement = (target: CourseOutlineResourceTarget) => {
    setMoveTarget(target);
  };

  const openResourceRemoval = (target: CourseOutlineResourceTarget) => {
    setRemoveTarget(target);
  };

  const confirmResourceMovement = (targetNodeId: string) => {
    if (!moveTarget) return;
    moveResourceRequest.run({ target: moveTarget, targetNodeId });
  };

  const canMoveContainer = (node: CourseOutlineContainerNode, offset: -1 | 1) => {
    const siblings = findCourseOutlineContainerSiblings(nodes, node.nodeId) ?? [];
    const index = siblings.findIndex((item) => item.nodeId === node.nodeId);
    const targetIndex = index + offset;
    return index >= 0 && targetIndex >= 0 && targetIndex < siblings.length;
  };

  return {
    chapterCreation: {
      loading: createChapterRequest.loading,
      submit: createChapterRequest.runAsync,
    },
    sectionDialog: {
      value: sectionDialog,
      name: sectionName,
      setName: setSectionName,
      loading: saveSectionRequest.loading,
      openCreate,
      openRename,
      close: () => setSectionDialog(null),
      submit: saveSectionRequest.run,
    },
    sectionDeletion: {
      target: deleteTarget,
      loading: deleteSectionRequest.loading,
      open: openDelete,
      close: () => setDeleteTarget(undefined),
      confirm: deleteSectionRequest.run,
    },
    sectionReorder: {
      loading: reorderRequest.loading,
      canMove: canMoveContainer,
      move: reorderRequest.run,
    },
    cloudMount: {
      target: cloudTarget,
      open: openCloudMount,
      close: () => setCloudTarget(undefined),
    },
    localUpload: {
      target: localTarget,
      open: openLocalUpload,
      close: () => setLocalTarget(undefined),
    },
    resourceMovement: {
      target: moveTarget,
      loading: moveResourceRequest.loading,
      open: openResourceMovement,
      close: () => setMoveTarget(undefined),
      confirm: confirmResourceMovement,
      moveToContainer: moveResourceRequest.run,
      moveToPosition: moveResourceRequest.run,
    },
    resourceRemoval: {
      target: removeTarget,
      loading: removeResourceRequest.loading,
      open: openResourceRemoval,
      close: () => setRemoveTarget(undefined),
      confirm: removeResourceRequest.run,
    },
  };
};
