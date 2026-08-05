import { useCourseService } from '@/domains';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  collectOutlineResources,
  filterCourseOutline,
  findOutlineNode,
  findOutlineResourceByResourceId,
  markCourseOutlineResourceRead,
} from '../model';

export const useCourseLearningNavigationController = (courseId: string) => {
  const courseService = useCourseService();
  const navigate = useNavigate();
  const { outlineNodeId = '' } = useParams<{ outlineNodeId: string }>();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const basePath = `/app/course/${courseId}`;
  const request = useRequest(() => courseService.getCourseOutline(courseId), {
    ready: Boolean(courseId),
    refreshDeps: [courseId],
  });
  const outlineNodes = request.data?.nodes ?? [];
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleNodes = filterCourseOutline(outlineNodes, normalizedQuery);
  const selectedNode =
    findOutlineNode(outlineNodes, outlineNodeId) ??
    findOutlineResourceByResourceId(outlineNodes, searchParams.get('resourceId') ?? '') ??
    outlineNodes[0];
  const selectedResources = selectedNode
    ? selectedNode.nodeType === 'RESOURCE'
      ? [selectedNode]
      : collectOutlineResources(selectedNode.children)
    : [];
  const selectedUnreadResourceId =
    selectedNode?.nodeType === 'RESOURCE' && !selectedNode.read ? selectedNode.resourceId : '';

  useRequest(() => courseService.setResourceRead({ resourceId: selectedUnreadResourceId }), {
    ready: Boolean(selectedUnreadResourceId),
    refreshDeps: [courseId, selectedUnreadResourceId],
    onSuccess: () => {
      request.mutate((outline) =>
        outline
          ? {
              ...outline,
              nodes: markCourseOutlineResourceRead(outline.nodes, selectedUnreadResourceId),
            }
          : outline
      );
    },
  });

  return {
    basePath,
    outlineNodes,
    visibleNodes,
    selectedNode,
    selectedResources,
    normalizedQuery,
    searchQuery,
    setSearchQuery,
    loading: request.loading,
    error: request.error,
    refresh: request.refresh,
    openOutlineNode: (nodeId: string) => navigate(`${basePath}/learning/${nodeId}`),
    openResource: (resourceId: string) => {
      const resource = findOutlineResourceByResourceId(outlineNodes, resourceId);
      if (resource) navigate(`${basePath}/learning/${resource.nodeId}`);
    },
    openCourseHome: () => navigate(`${basePath}/home`),
  };
};
