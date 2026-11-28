import type { CourseOutlineNode } from '@/domains/Course';

type CourseOutlineResourceDropPosition = 'before' | 'inside' | 'after';

export type CourseOutlineContainerNode = Extract<
  CourseOutlineNode,
  { nodeType: 'CHAPTER' | 'SECTION' }
>;
export type CourseOutlineResourceNode = Extract<CourseOutlineNode, { nodeType: 'RESOURCE' }>;

export interface CourseOutlineResourceTarget {
  node: CourseOutlineResourceNode;
  parentId: string;
}

export interface CourseOutlineResourceDropResult {
  targetNodeId: string;
  orderedResourceIds: string[];
}

export const findCourseOutlineResourceTarget = (
  nodes: CourseOutlineNode[],
  nodeId: string
): CourseOutlineResourceTarget | undefined => {
  const find = (
    items: CourseOutlineNode[],
    parentId?: string
  ): CourseOutlineResourceTarget | undefined => {
    for (const node of items) {
      if (node.nodeType === 'RESOURCE') {
        if (node.nodeId === nodeId && parentId) return { node, parentId };
        continue;
      }
      const target = find(node.children, node.nodeId);
      if (target) return target;
    }
    return undefined;
  };

  return find(nodes);
};

const findCourseOutlineNode = (
  nodes: CourseOutlineNode[],
  nodeId: string
): CourseOutlineNode | undefined => {
  for (const node of nodes) {
    if (node.nodeId === nodeId) return node;
    if (node.nodeType !== 'RESOURCE') {
      const child = findCourseOutlineNode(node.children, nodeId);
      if (child) return child;
    }
  }
  return undefined;
};

const resourceIdsInContainer = (node: CourseOutlineContainerNode): string[] =>
  node.children
    .filter((child): child is CourseOutlineResourceNode => child.nodeType === 'RESOURCE')
    .map((child) => child.resourceId);

/** Resolves a resource drop into the destination container and persisted resource order. */
export const resolveCourseOutlineResourceDrop = (
  nodes: CourseOutlineNode[],
  resourceTarget: CourseOutlineResourceTarget,
  dropNodeId: string,
  dropPosition: CourseOutlineResourceDropPosition
): CourseOutlineResourceDropResult | undefined => {
  const dropNode = findCourseOutlineNode(nodes, dropNodeId);
  if (!dropNode) return undefined;

  if (dropNode.nodeType === 'RESOURCE') {
    if (dropPosition !== 'before' && dropPosition !== 'after') return undefined;
    const dropTarget = findCourseOutlineResourceTarget(nodes, dropNodeId);
    if (!dropTarget) return undefined;
    const container = findCourseOutlineNode(nodes, dropTarget.parentId);
    if (!container || container.nodeType === 'RESOURCE') return undefined;

    const orderedResourceIds = resourceIdsInContainer(container).filter(
      (resourceId) => resourceId !== resourceTarget.node.resourceId
    );
    const anchorIndex = orderedResourceIds.indexOf(dropNode.resourceId);
    if (anchorIndex < 0) return undefined;
    orderedResourceIds.splice(
      dropPosition === 'before' ? anchorIndex : anchorIndex + 1,
      0,
      resourceTarget.node.resourceId
    );
    return { targetNodeId: dropTarget.parentId, orderedResourceIds };
  }

  if (dropPosition !== 'inside') return undefined;
  const orderedResourceIds = resourceIdsInContainer(dropNode).filter(
    (resourceId) => resourceId !== resourceTarget.node.resourceId
  );
  orderedResourceIds.push(resourceTarget.node.resourceId);
  return { targetNodeId: dropNode.nodeId, orderedResourceIds };
};

export const collectCourseOutlineContainerIds = (nodes: CourseOutlineNode[]): Set<string> => {
  const ids = new Set<string>();
  const collect = (items: CourseOutlineNode[]) => {
    items.forEach((node) => {
      if (node.nodeType === 'RESOURCE') return;
      ids.add(node.nodeId);
      collect(node.children);
    });
  };
  collect(nodes);
  return ids;
};

export const findCourseOutlineContainerSiblings = (
  nodes: CourseOutlineNode[],
  nodeId: string
): CourseOutlineContainerNode[] | undefined => {
  const containers = nodes.filter(
    (node): node is CourseOutlineContainerNode => node.nodeType !== 'RESOURCE'
  );
  if (containers.some((node) => node.nodeId === nodeId)) return containers;
  for (const container of containers) {
    const siblings = findCourseOutlineContainerSiblings(container.children, nodeId);
    if (siblings) return siblings;
  }
  return undefined;
};
