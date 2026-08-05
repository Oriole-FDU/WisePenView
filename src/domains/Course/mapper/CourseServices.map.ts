import {
  calculateCourseTeachingWeek,
  calculateCourseTotalTeachingWeeks,
  formatCoursePeriodRange,
  getCoursePeriodTimeRange,
  isCoursePeriod,
} from '@/domains/Course/constants/schedule';
import type {
  CourseAssessmentItem,
  CourseDetail,
  CourseFinalAssessment,
  CourseMeeting,
  CourseMember,
  CourseOutlineEditorNode,
  CourseOutlineNode,
  CourseProgress,
  CourseSummary,
} from '@/domains/Course/entity/course';
import {
  COURSE_ROLE,
  isCourseFinalAssessmentType,
  isCourseWeekPattern,
  type CourseRole,
} from '@/domains/Course/enum';
import type { Group, GroupMember } from '@/domains/Group';
import type { ResourceItem } from '@/domains/Resource';
import { TAG_META_SCHEMA, type TagMetaInfo, type TagTreeNode } from '@/domains/Tag';

const COURSE_META_SCHEMA = 'wisepen.course.v1';
const COURSE_META_KEYS = new Set([
  'schema',
  'term',
  'category',
  'startAt',
  'endAt',
  'outlineRootTagId',
  'learningObjectives',
  'meetings',
  'assessmentItems',
  'finalAssessment',
]);

interface CourseMetaV1 {
  schema: typeof COURSE_META_SCHEMA;
  term: string;
  category?: string;
  startAt?: string;
  endAt?: string;
  outlineRootTagId?: string;
  learningObjectives?: string[];
  meetings?: CourseMeeting[];
  assessmentItems?: CourseAssessmentItem[];
  finalAssessment?: CourseFinalAssessment;
}

interface SerializeCourseMetaRequest {
  term: string;
  category?: string;
  startAt?: string;
  endAt?: string;
  outlineRootTagId?: string;
  learningObjectives?: string[];
  meetings?: CourseMeeting[];
  assessmentItems?: CourseAssessmentItem[];
  finalAssessment?: CourseFinalAssessment;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getCourseOutlineResourceOrder = (tagMetaInfo?: TagMetaInfo): string[] =>
  Array.isArray(tagMetaInfo?.resourceOrder)
    ? tagMetaInfo.resourceOrder.filter((value): value is string => typeof value === 'string')
    : [];

const mapCourseOutlineResourceOrderMeta = (
  tagMetaInfo: TagMetaInfo | undefined,
  orderedResourceIds: string[]
): TagMetaInfo => ({
  ...tagMetaInfo,
  schema: tagMetaInfo?.schema ?? TAG_META_SCHEMA,
  resourceOrder: orderedResourceIds,
});

const sortCourseOutlineResources = <T extends { resourceId: string }>(
  resources: T[],
  tagMetaInfo?: TagMetaInfo
): T[] => {
  const resourceOrder = getCourseOutlineResourceOrder(tagMetaInfo);
  if (resourceOrder.length === 0) return resources;
  const orderIndex = new Map(resourceOrder.map((resourceId, index) => [resourceId, index]));
  return [...resources].sort((left, right) => {
    const leftIndex = orderIndex.get(left.resourceId);
    const rightIndex = orderIndex.get(right.resourceId);
    if (leftIndex === undefined && rightIndex === undefined) return 0;
    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
};

const collectCourseOutlineTagIds = (tags: TagTreeNode[]): string[] =>
  tags.flatMap((tag) => [tag.tagId, ...collectCourseOutlineTagIds(tag.children ?? [])]);

const mapCourseOutlineNodes = (
  tags: TagTreeNode[],
  resources: ResourceItem[]
): CourseOutlineNode[] => {
  const outlineTagIds = new Set(collectCourseOutlineTagIds(tags));
  const resourcesByTagId = new Map<string, ResourceItem[]>();

  for (const resource of resources) {
    for (const tagId of Object.keys(resource.currentTags ?? {})) {
      if (!outlineTagIds.has(tagId)) continue;
      const tagResources = resourcesByTagId.get(tagId) ?? [];
      tagResources.push(resource);
      resourcesByTagId.set(tagId, tagResources);
    }
  }

  const mapTags = (items: TagTreeNode[], depth: number): CourseOutlineNode[] =>
    items.map((tag) => ({
      nodeId: tag.tagId,
      title: tag.tagName,
      nodeType: depth === 0 ? ('CHAPTER' as const) : ('SECTION' as const),
      description: tag.tagDesc,
      children: [
        ...mapTags(tag.children ?? [], depth + 1),
        ...sortCourseOutlineResources(resourcesByTagId.get(tag.tagId) ?? [], tag.tagMetaInfo).map(
          (resource) => ({
            nodeId: `${tag.tagId}:${resource.resourceId}`,
            title: resource.resourceName,
            nodeType: 'RESOURCE' as const,
            resourceId: resource.resourceId,
            resourceType: resource.resourceType ?? 'file',
            read: resource.myInteraction?.read ?? false,
          })
        ),
      ],
    }));

  return mapTags(tags, 0);
};

const mapCourseOutlineEditorNodes = (
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
          children: mapCourseOutlineEditorNodes(node.children, node.nodeId),
        }
  );

const calculateCourseOutlineProgress = (nodes: CourseOutlineNode[]): CourseProgress => {
  const readByResourceId = new Map<string, boolean>();
  const collect = (items: CourseOutlineNode[]) => {
    for (const node of items) {
      if (node.nodeType === 'RESOURCE') {
        readByResourceId.set(
          node.resourceId,
          Boolean(readByResourceId.get(node.resourceId)) || node.read
        );
      } else {
        collect(node.children);
      }
    }
  };
  collect(nodes);

  const totalResourceCount = readByResourceId.size;
  const readResourceCount = Array.from(readByResourceId.values()).filter(Boolean).length;
  return {
    readResourceCount,
    totalResourceCount,
    percent:
      totalResourceCount === 0 ? 0 : Math.round((readResourceCount / totalResourceCount) * 100),
  };
};

const parseOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const parseFinalAssessment = (value: unknown): CourseFinalAssessment | undefined => {
  if (!isRecord(value)) return undefined;
  if (!isCourseFinalAssessmentType(value.type)) return undefined;
  return {
    type: value.type,
    customName: parseOptionalString(value.customName),
    examForm: parseOptionalString(value.examForm),
    date: parseOptionalString(value.date),
    startTime: parseOptionalString(value.startTime),
    endTime: parseOptionalString(value.endTime),
    location: parseOptionalString(value.location),
    deadline: parseOptionalString(value.deadline),
  };
};

const parseCourseMeta = (groupMetaInfo: Record<string, unknown>): CourseMetaV1 => {
  const raw = groupMetaInfo.course;
  if (!isRecord(raw) || raw.schema !== COURSE_META_SCHEMA) {
    return { schema: COURSE_META_SCHEMA, term: '' };
  }
  return {
    schema: COURSE_META_SCHEMA,
    term: typeof raw.term === 'string' ? raw.term : '',
    category: typeof raw.category === 'string' ? raw.category : undefined,
    startAt: typeof raw.startAt === 'string' ? raw.startAt : undefined,
    endAt: typeof raw.endAt === 'string' ? raw.endAt : undefined,
    outlineRootTagId: typeof raw.outlineRootTagId === 'string' ? raw.outlineRootTagId : undefined,
    learningObjectives: Array.isArray(raw.learningObjectives)
      ? raw.learningObjectives.filter((item): item is string => typeof item === 'string')
      : undefined,
    meetings: Array.isArray(raw.meetings)
      ? raw.meetings.filter(
          (item): item is CourseMeeting =>
            isRecord(item) &&
            typeof item.meetingId === 'string' &&
            isCourseWeekPattern(item.weekPattern) &&
            typeof item.weekday === 'string' &&
            isCoursePeriod(item.startPeriod) &&
            isCoursePeriod(item.endPeriod) &&
            item.startPeriod <= item.endPeriod &&
            typeof item.location === 'string'
        )
      : undefined,
    assessmentItems: Array.isArray(raw.assessmentItems)
      ? raw.assessmentItems.filter(
          (item): item is CourseAssessmentItem =>
            isRecord(item) && typeof item.label === 'string' && typeof item.weight === 'number'
        )
      : undefined,
    finalAssessment: parseFinalAssessment(raw.finalAssessment),
  };
};

const serializeCourseMeta = (
  params: SerializeCourseMetaRequest,
  groupMetaInfo: Record<string, unknown> = {}
): Record<string, unknown> => {
  const currentCourseMeta = isRecord(groupMetaInfo.course) ? groupMetaInfo.course : {};
  const unknownCourseMeta = Object.fromEntries(
    Object.entries(currentCourseMeta).filter(([key]) => !COURSE_META_KEYS.has(key))
  );
  return {
    ...groupMetaInfo,
    course: {
      ...unknownCourseMeta,
      schema: COURSE_META_SCHEMA,
      term: params.term,
      ...(params.category !== undefined ? { category: params.category } : {}),
      ...(params.startAt ? { startAt: params.startAt } : {}),
      ...(params.endAt ? { endAt: params.endAt } : {}),
      ...(params.outlineRootTagId ? { outlineRootTagId: params.outlineRootTagId } : {}),
      ...(params.learningObjectives ? { learningObjectives: params.learningObjectives } : {}),
      ...(params.meetings ? { meetings: params.meetings } : {}),
      ...(params.assessmentItems ? { assessmentItems: params.assessmentItems } : {}),
      ...(params.finalAssessment ? { finalAssessment: params.finalAssessment } : {}),
    } satisfies CourseMetaV1,
  };
};

const mapGroupRole = (role: 'OWNER' | 'ADMIN' | 'MEMBER'): CourseRole => {
  if (role === 'OWNER') return COURSE_ROLE.TEACHER;
  if (role === 'ADMIN') return COURSE_ROLE.ASSISTANT;
  return COURSE_ROLE.STUDENT;
};

const mapGroupMemberToCourseMember = (member: GroupMember): CourseMember => ({
  userId: member.userId,
  name: member.realname || member.nickname,
  avatar: member.avatar || undefined,
  email: member.email ?? '',
  studentNumber: member.campusNo,
  role: mapGroupRole(member.role),
});

const getTeacherName = (group: Group): string =>
  group.ownerInfo?.realName || group.ownerInfo?.nickname || '';

const mapGroupToCourseSummary = (
  group: Group,
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
): CourseSummary => {
  const metadata = parseCourseMeta(group.groupMetaInfo);
  return {
    courseId: group.groupId,
    name: group.groupName,
    description: group.groupDesc,
    coverUrl: group.groupCoverUrl || undefined,
    term: metadata.term,
    category: metadata.category,
    myRole: mapGroupRole(role),
    teacherName: getTeacherName(group),
  };
};

const mapGroupToCourseDetail = (group: Group, role: 'OWNER' | 'ADMIN' | 'MEMBER'): CourseDetail => {
  const metadata = parseCourseMeta(group.groupMetaInfo);
  const teacherName = getTeacherName(group);
  return {
    ...mapGroupToCourseSummary(group, role),
    teacher: {
      userId: group.ownerId ?? '',
      name: teacherName,
      avatar: group.ownerInfo?.avatar,
    },
    startAt: metadata.startAt,
    endAt: metadata.endAt,
    meetingSchedule: metadata.meetings
      ?.map(
        (meeting) =>
          `${meeting.weekday} ${formatCoursePeriodRange(meeting.startPeriod, meeting.endPeriod)} ${getCoursePeriodTimeRange(meeting.startPeriod, meeting.endPeriod)}`
      )
      .join('；'),
    location: metadata.meetings
      ?.map((meeting) => meeting.location)
      .filter(Boolean)
      .join('；'),
    learningObjectives: metadata.learningObjectives ?? [],
    assessmentItems: metadata.assessmentItems ?? [],
    meetings: metadata.meetings ?? [],
    finalAssessment: metadata.finalAssessment,
    outlineRootTagId: metadata.outlineRootTagId,
    teachingWeek: calculateCourseTeachingWeek(metadata.startAt, Date.now(), metadata.endAt),
    totalTeachingWeeks: calculateCourseTotalTeachingWeeks(metadata.startAt, metadata.endAt),
    memberCount: group.memberCount,
  };
};

export const CourseServicesMap = {
  parseCourseMeta,
  serializeCourseMeta,
  getCourseOutlineResourceOrder,
  mapCourseOutlineResourceOrderMeta,
  sortCourseOutlineResources,
  collectCourseOutlineTagIds,
  mapCourseOutlineNodes,
  mapCourseOutlineEditorNodes,
  calculateCourseOutlineProgress,
  mapGroupToCourseSummary,
  mapGroupToCourseDetail,
  mapGroupMemberToCourseMember,
};
