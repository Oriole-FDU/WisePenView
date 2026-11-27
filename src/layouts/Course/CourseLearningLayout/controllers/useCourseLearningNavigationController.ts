import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useCourseService } from '@/domains';
import type { CourseOutlineNode, CourseOutlineReference } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { buildCourseLearningPath, buildCoursePath } from '@/utils/navigation/appRoute';
import { buildChatSessionLocation, getChatSessionId } from '@/utils/navigation/chatRoute';

import {
  attachOutlineResources,
  collectOutlineResources,
  findOutlineNode,
  findOutlineResourceByResourceId,
  indexOutlineSections,
  splitResourceNodeId,
} from '../model';
import { useCourseOutlinePages } from './useCourseOutlinePages';

const NO_NODES: CourseOutlineNode[] = [];

export const useCourseLearningNavigationController = (course: CourseOutlineReference) => {
  const courseService = useCourseService();
  const { courseId } = course;
  const navigate = useNavigate();
  const location = useLocation();
  const { outlineNodeId = '' } = useParams<{ outlineNodeId: string }>();
  const [expansion, setExpansion] = useState<{ resourceKey?: string; keys: string[] }>({
    keys: [],
  });
  const [markedRead, setMarkedRead] = useState(new Set<string>());
  const refreshTags = useRef(new Set<string>());
  const { pages, loadPage } = useCourseOutlinePages(courseId);

  const outline = useApi((refresh?: boolean) => courseService.getCourseOutline(course, refresh), {
    onSuccess: ({ nodes }) => {
      refreshTags.current.forEach((nodeId) => {
        const node = findOutlineNode(nodes, nodeId);
        if (node && node.nodeType !== 'RESOURCE') loadPage(node, undefined, true);
      });
      refreshTags.current.clear();
    },
  });
  const chapters = outline.data?.nodes ?? NO_NODES;
  const sections = useMemo(() => indexOutlineSections(chapters), [chapters]);

  const resourcePosition = splitResourceNodeId(outlineNodeId);
  const resource = useApi(
    async (nodeId: string) => {
      const position = splitResourceNodeId(nodeId);
      if (!position) return undefined;
      const node = await courseService.getCourseOutlineResource({ courseId, ...position });
      return { key: nodeId, node };
    },
    {
      ready: Boolean(resourcePosition),
      defaultParams: [outlineNodeId],
      refreshDeps: [outlineNodeId],
      refreshDepsAction: (): void => {
        resource.run(outlineNodeId);
      },
      showErrorToast: false,
    }
  );
  const currentRequest = resource.params?.[0] === outlineNodeId;
  const resourceError = currentRequest && !resource.loading ? resource.error : undefined;
  const selectedResource =
    resource.data?.key === outlineNodeId && !resourceError ? resource.data.node : undefined;
  const selectedUnreadResourceId =
    selectedResource && !selectedResource.read && !markedRead.has(selectedResource.resourceId)
      ? selectedResource.resourceId
      : '';

  useApi(
    async () => {
      await courseService.setResourceRead({ resourceId: selectedUnreadResourceId });
      return selectedUnreadResourceId;
    },
    {
      ready: Boolean(selectedUnreadResourceId),
      refreshDeps: [selectedUnreadResourceId],

      onSuccess: (resourceId) => {
        setMarkedRead((previous) => new Set(previous).add(resourceId));
      },
      showErrorToast: false,
    }
  );
  const outlineNodes = useMemo(
    () => attachOutlineResources(chapters, pages, markedRead),
    [chapters, pages, markedRead]
  );
  const sidebarNodes = useMemo(
    () =>
      selectedResource
        ? attachOutlineResources(
            chapters,
            pages,
            markedRead,
            selectedResource,
            resourcePosition?.tagId
          )
        : outlineNodes,
    [chapters, pages, markedRead, selectedResource, resourcePosition?.tagId, outlineNodes]
  );
  const selectedPath = resourcePosition && sections.get(resourcePosition.tagId)?.path;
  if (selectedResource && selectedPath && expansion.resourceKey !== outlineNodeId) {
    setExpansion({
      resourceKey: outlineNodeId,
      keys: [...new Set([...expansion.keys, ...selectedPath])],
    });
  } else if (!resourcePosition && expansion.resourceKey !== undefined) {
    setExpansion({ keys: expansion.keys });
  }

  const selectedNode = resourcePosition
    ? selectedResource
    : outlineNodeId
      ? findOutlineNode(outlineNodes, outlineNodeId)
      : outlineNodes[0];
  const selectedResources =
    selectedNode && selectedNode.nodeType !== 'RESOURCE'
      ? collectOutlineResources(selectedNode.children)
      : [];

  const loadResources = (nodeId: string, action: 'first' | 'more' | 'retry') => {
    const node = sections.get(nodeId)?.node;
    if (!node) return;
    const previous = pages.get(nodeId);
    if (action === 'first' && (previous?.loaded || previous?.error)) return;
    const cursor = action === 'retry' ? previous?.error?.cursor : previous?.nextCursor;
    if (action === 'more' && !cursor) return;
    loadPage(node, cursor, action === 'retry' && cursor === undefined);
  };

  const openOutlineNode = (nodeId: string) =>
    navigate(
      buildChatSessionLocation(
        { pathname: buildCourseLearningPath(courseId, nodeId) },
        getChatSessionId(location)
      )
    );

  return {
    outlineNodes,
    sidebarNodes,
    sections,
    selectedNode,
    selectedResources,
    expandedKeys: expansion.keys,
    loading: outline.loading,
    error: outline.error,
    resourceLoading: Boolean(resourcePosition && !selectedResource && !resourceError),
    resourceError,
    resourcePageStateMap: pages,
    setExpandedKeys: (keys: string[]) => setExpansion((previous) => ({ ...previous, keys })),
    expandOutlineNode: (nodeId: string) => loadResources(nodeId, 'first'),
    loadMoreOutlineResources: (nodeId: string) => loadResources(nodeId, 'more'),
    retryOutlineResources: (nodeId: string) => loadResources(nodeId, 'retry'),
    retryResource: resource.refresh,
    refresh: (affectedTags?: string[]) => {
      affectedTags?.forEach((nodeId) => {
        if (pages.has(nodeId)) refreshTags.current.add(nodeId);
      });
      outline.run(true);
      if (resourcePosition) resource.refresh();
    },
    openOutlineNode,
    openResource: (resourceId: string) => {
      const node = findOutlineResourceByResourceId(outlineNodes, resourceId);
      if (node) void openOutlineNode(node.nodeId);
    },
    openCourseHome: () =>
      navigate(
        buildChatSessionLocation(
          { pathname: buildCoursePath(courseId, 'home') },
          getChatSessionId(location)
        )
      ),
  };
};
