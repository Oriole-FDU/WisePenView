import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { buildCourseLearningPath, buildCoursePath } from '@/utils/navigation/appRoute';

import {
  appendCourseOutlineResources,
  collectOutlineResources,
  type CourseOutlineResourcePageState,
  filterCourseOutline,
  findOutlineNode,
  findOutlineResourceByResourceId,
  markCourseOutlineResourceRead,
} from '../model';

export const useCourseLearningNavigationController = (courseId: string) => {
  const courseService = useCourseService();
  const navigate = useNavigate();
  const { outlineNodeId = '' } = useParams<{ outlineNodeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [resourcePageStateMap, setResourcePageStateMap] = useState<
    Map<string, CourseOutlineResourcePageState>
  >(new Map());
  const requestVersionRef = useRef(0);
  const loadingNodeIdsRef = useRef<Set<string>>(new Set());
  const request = useApi(() => courseService.getCourseOutline(courseId), {
    ready: Boolean(courseId),
    refreshDeps: [courseId],
    onBefore: () => {
      requestVersionRef.current += 1;
      loadingNodeIdsRef.current.clear();
      setResourcePageStateMap(new Map());
    },
  });
  const resourcePageRequest = useApi(
    (nodeId: string, cursor?: string) =>
      courseService.loadCourseOutlineResources({ courseId, nodeId, cursor }),
    { manual: true }
  );
  const outlineNodes = request.data?.nodes ?? [];
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleNodes = filterCourseOutline(outlineNodes, normalizedQuery);
  const selectedNode = findOutlineNode(outlineNodes, outlineNodeId) ?? outlineNodes[0];
  const selectedResources = selectedNode
    ? selectedNode.nodeType === 'RESOURCE'
      ? [selectedNode]
      : collectOutlineResources(selectedNode.children)
    : [];
  const selectedUnreadResourceId =
    selectedNode?.nodeType === 'RESOURCE' && !selectedNode.read ? selectedNode.resourceId : '';

  useApi(() => courseService.setResourceRead({ resourceId: selectedUnreadResourceId }), {
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

  const loadResourcePage = async (nodeId: string, cursor?: string) => {
    if (loadingNodeIdsRef.current.has(nodeId)) return;
    const requestVersion = requestVersionRef.current;
    loadingNodeIdsRef.current.add(nodeId);
    setResourcePageStateMap((current) => {
      const previous = current.get(nodeId);
      return new Map(current).set(nodeId, {
        loaded: previous?.loaded ?? false,
        loading: true,
        loadedCount: previous?.loadedCount ?? 0,
        total: previous?.total ?? 0,
        nextCursor: previous?.nextCursor,
      });
    });
    try {
      const page = await resourcePageRequest.runAsync(nodeId, cursor);
      if (requestVersion !== requestVersionRef.current) return;
      request.mutate((outline) =>
        outline
          ? {
              ...outline,
              nodes: appendCourseOutlineResources(outline.nodes, nodeId, page.list),
            }
          : outline
      );
      setResourcePageStateMap((current) => {
        const previous = current.get(nodeId);
        return new Map(current).set(nodeId, {
          loaded: true,
          loading: false,
          loadedCount: (previous?.loadedCount ?? 0) + page.list.length,
          total: page.total,
          nextCursor: page.nextCursor,
        });
      });
    } catch {
      // 错误提示由 useApi 统一处理。
    } finally {
      loadingNodeIdsRef.current.delete(nodeId);
      if (requestVersion === requestVersionRef.current) {
        setResourcePageStateMap((current) => {
          const previous = current.get(nodeId);
          if (!previous?.loading) return current;
          return new Map(current).set(nodeId, { ...previous, loading: false });
        });
      }
    }
  };

  const expandOutlineNode = (nodeId: string) => {
    const pageState = resourcePageStateMap.get(nodeId);
    if (!pageState?.loaded && !pageState?.loading) void loadResourcePage(nodeId);
  };

  const loadMoreOutlineResources = (nodeId: string) => {
    const pageState = resourcePageStateMap.get(nodeId);
    if (pageState?.nextCursor && !pageState.loading) {
      void loadResourcePage(nodeId, pageState.nextCursor);
    }
  };

  const refreshOutline = () => {
    const loadedNodeIds = [...resourcePageStateMap.entries()]
      .filter(([, pageState]) => pageState.loaded)
      .map(([nodeId]) => nodeId);
    void request
      .refreshAsync()
      .then(() => loadedNodeIds.forEach((nodeId) => void loadResourcePage(nodeId)))
      .catch(() => undefined);
  };

  return {
    outlineNodes,
    visibleNodes,
    selectedNode,
    selectedResources,
    normalizedQuery,
    searchQuery,
    setSearchQuery,
    loading: request.loading,
    error: request.error,
    resourcePageStateMap,
    expandOutlineNode,
    loadMoreOutlineResources,
    refresh: refreshOutline,
    openOutlineNode: (nodeId: string) => navigate(buildCourseLearningPath(courseId, nodeId)),
    openResource: (resourceId: string) => {
      const resource = findOutlineResourceByResourceId(outlineNodes, resourceId);
      if (resource) navigate(buildCourseLearningPath(courseId, resource.nodeId));
    },
    openCourseHome: () => navigate(buildCoursePath(courseId, 'home')),
  };
};
