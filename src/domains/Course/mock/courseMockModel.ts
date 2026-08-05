import type { Group } from '@/domains/Group';
import { GROUP_TYPE } from '@/domains/Group';
import { findMockGroup } from '@/domains/Group/mock/groupStore.mock';
import type {
  CourseDetail,
  CourseOutlineEditorNode,
  CourseOutlineNode,
  CourseSummary,
} from '../entity/course';
import { CourseServicesMap } from '../mapper/CourseServices.map';

export const cloneCourseMockValue = <T>(value: T): T => structuredClone(value);

export const mapCourseDetailToMockGroup = (detail: CourseDetail): Group => {
  const current = findMockGroup(detail.courseId);
  return {
    groupId: detail.courseId,
    groupName: detail.name,
    groupDesc: detail.description,
    groupCoverUrl: detail.coverUrl ?? '',
    groupMetaInfo: CourseServicesMap.serializeCourseMeta(
      {
        term: detail.term,
        category: detail.category,
        startAt: detail.startAt,
        endAt: detail.endAt,
        outlineRootTagId: `outline-root-${detail.courseId}`,
        learningObjectives: detail.learningObjectives,
        meetings: detail.meetings,
        assessmentItems: detail.assessmentItems,
        finalAssessment: detail.finalAssessment,
      },
      current?.groupMetaInfo
    ),
    groupType: GROUP_TYPE.ADVANCED,
    ownerId: detail.teacher.userId,
    ownerInfo: {
      nickname: detail.teacher.name,
      realName: detail.teacher.name,
      avatar: detail.teacher.avatar,
      identityType: 2,
    },
    memberCount: detail.memberCount,
    createTime: current?.createTime ?? '2026-02-20T00:00:00.000Z',
    inviteCode: current?.inviteCode ?? `COURSE-${detail.courseId}`,
    tokenUsed: current?.tokenUsed ?? 0,
    tokenBalance: current?.tokenBalance ?? 1000,
  };
};

export const syncCourseMockBaseInfoFromGroup = (detail: CourseDetail): void => {
  const group = findMockGroup(detail.courseId);
  if (!group) return;
  const metadata = CourseServicesMap.parseCourseMeta(group.groupMetaInfo);
  detail.name = group.groupName;
  detail.description = group.groupDesc;
  detail.coverUrl = group.groupCoverUrl || undefined;
  detail.term = metadata.term || detail.term;
  detail.category = metadata.category;
  detail.startAt = metadata.startAt;
  detail.endAt = metadata.endAt;
  detail.learningObjectives = metadata.learningObjectives ?? detail.learningObjectives;
  detail.meetings = metadata.meetings ?? detail.meetings;
  detail.assessmentItems = metadata.assessmentItems ?? detail.assessmentItems;
  detail.finalAssessment = metadata.finalAssessment;
};

export const mapCourseMockDetailToSummary = (detail: CourseDetail): CourseSummary => {
  const {
    assessmentItems: _assessmentItems,
    finalAssessment: _finalAssessment,
    endAt: _endAt,
    learningObjectives: _learningObjectives,
    location: _location,
    meetings: _meetings,
    meetingSchedule: _meetingSchedule,
    startAt: _startAt,
    teacher: _teacher,
    teachingWeek: _teachingWeek,
    totalTeachingWeeks: _totalTeachingWeeks,
    memberCount: _memberCount,
    outlineRootTagId: _outlineRootTagId,
    ...summary
  } = detail;
  return summary;
};

export const markCourseMockResourceRead = (
  nodes: CourseOutlineNode[],
  resourceId: string
): boolean => {
  let found = false;
  for (const node of nodes) {
    if (node.nodeType === 'RESOURCE') {
      if (node.resourceId === resourceId) {
        node.read = true;
        found = true;
      }
    } else if (markCourseMockResourceRead(node.children, resourceId)) {
      found = true;
    }
  }
  return found;
};

export const countCourseMockReadResources = (
  nodes: CourseOutlineNode[]
): { read: number; total: number } => {
  const resources = new Map<string, boolean>();
  const collect = (items: CourseOutlineNode[]) => {
    for (const node of items) {
      if (node.nodeType === 'RESOURCE') {
        resources.set(node.resourceId, Boolean(resources.get(node.resourceId)) || node.read);
      } else {
        collect(node.children);
      }
    }
  };
  collect(nodes);
  let read = 0;
  for (const isRead of resources.values()) {
    if (isRead) read += 1;
  }
  return { read, total: resources.size };
};

export const mapCourseMockOutlineToEditorNodes = (
  nodes: CourseOutlineNode[],
  parentId?: string
): CourseOutlineEditorNode[] =>
  nodes.map((node) =>
    node.nodeType === 'RESOURCE'
      ? {
          nodeId: node.nodeId,
          name: node.title,
          entryType: 'resource',
          resourceId: node.resourceId,
          resourceType: node.resourceType,
          parentId,
        }
      : {
          nodeId: node.nodeId,
          name: node.title,
          entryType: 'folder',
          parentId,
          children: mapCourseMockOutlineToEditorNodes(node.children, node.nodeId),
        }
  );

export const findCourseMockOutlineContainer = (
  nodes: CourseOutlineNode[],
  nodeId: string
): Extract<CourseOutlineNode, { nodeType: 'CHAPTER' | 'SECTION' }> | undefined => {
  for (const node of nodes) {
    if (node.nodeType === 'RESOURCE') continue;
    if (node.nodeId === nodeId) return node;
    const child = findCourseMockOutlineContainer(node.children, nodeId);
    if (child) return child;
  }
  return undefined;
};

export const deleteCourseMockOutlineNode = (
  nodes: CourseOutlineNode[],
  nodeId: string
): boolean => {
  const index = nodes.findIndex((node) => node.nodeId === nodeId);
  if (index >= 0) {
    nodes.splice(index, 1);
    return true;
  }
  return nodes.some(
    (node) => node.nodeType !== 'RESOURCE' && deleteCourseMockOutlineNode(node.children, nodeId)
  );
};

const findCourseMockSiblingList = (
  nodes: CourseOutlineNode[],
  nodeId: string
): CourseOutlineNode[] | undefined => {
  if (nodes.some((node) => node.nodeId === nodeId)) return nodes;
  for (const node of nodes) {
    if (node.nodeType === 'RESOURCE') continue;
    const siblings = findCourseMockSiblingList(node.children, nodeId);
    if (siblings) return siblings;
  }
  return undefined;
};

export const reorderCourseMockOutlineSections = (
  nodes: CourseOutlineNode[],
  orderedNodeIds: string[]
): boolean => {
  const firstNodeId = orderedNodeIds[0];
  if (!firstNodeId) return true;
  const siblings = findCourseMockSiblingList(nodes, firstNodeId);
  if (!siblings) return false;
  const sectionMap = new Map(
    siblings
      .filter((node) => node.nodeType !== 'RESOURCE')
      .map((node) => [node.nodeId, node] as const)
  );
  if (
    orderedNodeIds.length !== sectionMap.size ||
    orderedNodeIds.some((nodeId) => !sectionMap.has(nodeId))
  ) {
    return false;
  }
  const resources = siblings.filter((node) => node.nodeType === 'RESOURCE');
  siblings.splice(
    0,
    siblings.length,
    ...orderedNodeIds.map((nodeId) => sectionMap.get(nodeId)!),
    ...resources
  );
  return true;
};

export const takeCourseMockOutlineResource = (
  nodes: CourseOutlineNode[],
  resourceId: string,
  parentNodeId: string
): Extract<CourseOutlineNode, { nodeType: 'RESOURCE' }> | undefined => {
  const parent = findCourseMockOutlineContainer(nodes, parentNodeId);
  if (!parent) return undefined;
  const index = parent.children.findIndex(
    (node) => node.nodeType === 'RESOURCE' && node.resourceId === resourceId
  );
  if (index < 0) return undefined;
  const [resource] = parent.children.splice(index, 1);
  return resource?.nodeType === 'RESOURCE' ? resource : undefined;
};

export const reorderCourseMockOutlineResources = (
  container: Extract<CourseOutlineNode, { nodeType: 'CHAPTER' | 'SECTION' }>,
  orderedResourceIds: string[]
): boolean => {
  const resources = container.children.filter(
    (node): node is Extract<CourseOutlineNode, { nodeType: 'RESOURCE' }> =>
      node.nodeType === 'RESOURCE'
  );
  const resourceMap = new Map(resources.map((resource) => [resource.resourceId, resource]));
  if (
    orderedResourceIds.length !== resourceMap.size ||
    orderedResourceIds.some((resourceId) => !resourceMap.has(resourceId))
  ) {
    return false;
  }
  const containers = container.children.filter((node) => node.nodeType !== 'RESOURCE');
  container.children = [
    ...containers,
    ...orderedResourceIds.map((resourceId) => resourceMap.get(resourceId)!),
  ];
  return true;
};
