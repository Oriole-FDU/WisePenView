import { useUnmount } from 'ahooks';
import { useRef, useState } from 'react';

import { useCourseService } from '@/domains';
import type { CourseOutlineContainerNode } from '@/domains/Course';
import { authSessionCoordinator } from '@/utils/auth';

import type { CourseOutlineResourcePageState } from '../model';

const EMPTY_PAGE: CourseOutlineResourcePageState = {
  list: [],
  loaded: false,
  loading: false,
  total: 0,
};

export function useCourseOutlinePages(courseId: string) {
  const courseService = useCourseService();
  const [pages, setPages] = useState(new Map<string, CourseOutlineResourcePageState>());
  const requests = useRef(new Map<string, symbol>());
  useUnmount(() => requests.current.clear());

  const loadPage = (node: CourseOutlineContainerNode, cursor?: string, replace = false) => {
    const nodeId = node.nodeId;
    if (!replace && requests.current.has(nodeId)) return;
    const request = Symbol(nodeId);
    const session = authSessionCoordinator.getSessionVersion();
    requests.current.set(nodeId, request);
    setPages((previous) =>
      new Map(previous).set(nodeId, {
        ...(previous.get(nodeId) ?? EMPTY_PAGE),
        loading: true,
        error: undefined,
      })
    );

    const complete = (
      update: (previous: CourseOutlineResourcePageState) => CourseOutlineResourcePageState
    ) => {
      if (requests.current.get(nodeId) !== request) return;
      requests.current.delete(nodeId);
      if (session !== authSessionCoordinator.getSessionVersion()) return;
      setPages((previous) =>
        new Map(previous).set(nodeId, update(previous.get(nodeId) ?? EMPTY_PAGE))
      );
    };

    void courseService
      .loadCourseOutlineResources({
        courseId,
        nodeId,
        resourceOrder: node.resourceOrder,
        cursor,
      })
      .then(
        (page) =>
          complete((previous) => {
            const byId = new Map(
              (cursor ? previous.list : []).map((resource) => [resource.resourceId, resource])
            );
            page.list.forEach((resource) => byId.set(resource.resourceId, resource));
            return {
              ...page,
              list: [...byId.values()],
              loaded: true,
              loading: false,
            };
          }),
        (error: unknown) =>
          complete((previous) => ({
            ...previous,
            loading: false,
            error: { cause: error, cursor },
          }))
      );
  };

  return { pages, loadPage };
}
