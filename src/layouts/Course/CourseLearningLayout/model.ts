import type {
  CourseOutlineContainerNode,
  CourseOutlineNode,
  CourseOutlineResourceNode,
} from '@/domains/Course';

export interface CourseOutlineResourcePageState {
  loaded: boolean;
  loading: boolean;
  list: CourseOutlineResourceNode[];
  total: number;
  nextCursor?: string;
  error?: { cause: unknown; cursor?: string };
}

export const findOutlineNode = (
  nodes: CourseOutlineNode[],
  nodeId: string
): CourseOutlineNode | undefined => {
  for (const node of nodes) {
    if (node.nodeId === nodeId) return node;
    if (node.nodeType !== 'RESOURCE') {
      const child = findOutlineNode(node.children, nodeId);
      if (child) return child;
    }
  }
  return undefined;
};

export const collectOutlineResources = (
  nodes: CourseOutlineNode[]
): CourseOutlineResourceNode[] => {
  const resources: CourseOutlineResourceNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === 'RESOURCE') resources.push(node);
    else resources.push(...collectOutlineResources(node.children));
  }
  return resources;
};

export const findOutlineResourceByResourceId = (
  nodes: CourseOutlineNode[],
  resourceId: string
): CourseOutlineResourceNode | undefined => {
  for (const node of nodes) {
    if (node.nodeType === 'RESOURCE') {
      if (node.resourceId === resourceId) return node;
      continue;
    }
    const child = findOutlineResourceByResourceId(node.children, resourceId);
    if (child) return child;
  }
  return undefined;
};

export function attachOutlineResources(
  nodes: CourseOutlineNode[],
  pages: ReadonlyMap<string, CourseOutlineResourcePageState>,
  markedRead: ReadonlySet<string>,
  selectedResource?: CourseOutlineResourceNode,
  selectedTagId?: string
): CourseOutlineNode[] {
  return nodes.map((node) => {
    if (node.nodeType === 'RESOURCE') return node;
    const page = pages.get(node.nodeId);
    const resources = page?.list ?? [];
    const children = attachOutlineResources(
      node.children,
      pages,
      markedRead,
      selectedResource,
      selectedTagId
    );
    if (
      selectedResource &&
      selectedTagId === node.nodeId &&
      !resources.some((resource) => resource.resourceId === selectedResource.resourceId)
    ) {
      children.push(selectedResource);
    }
    children.push(
      ...resources.map((resource) =>
        !resource.read && markedRead.has(resource.resourceId)
          ? { ...resource, read: true }
          : resource
      )
    );
    return { ...node, children };
  });
}

export function indexOutlineSections(nodes: CourseOutlineNode[]) {
  const sections = new Map<string, { node: CourseOutlineContainerNode; path: string[] }>();
  const visit = (children: CourseOutlineNode[], parents: string[]) => {
    for (const node of children) {
      if (node.nodeType === 'RESOURCE') continue;
      const path = [...parents, node.nodeId];
      sections.set(node.nodeId, { node, path });
      visit(node.children, path);
    }
  };
  visit(nodes, []);
  return sections;
}

export const splitResourceNodeId = (nodeId: string) => {
  const separator = nodeId.indexOf(':');
  if (separator < 1 || separator === nodeId.length - 1) return undefined;
  return { tagId: nodeId.slice(0, separator), resourceId: nodeId.slice(separator + 1) };
};
