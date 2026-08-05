import {
  removeMockGroup,
  replaceMockAdvancedGroups,
  upsertMockGroup,
} from '@/domains/Group/mock/groupStore.mock';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { createDefaultCourseAssessmentItems } from '../constants/defaults';
import {
  calculateCourseTeachingWeek,
  calculateCourseTotalTeachingWeeks,
  formatCoursePeriodRange,
  getCoursePeriodTimeRange,
} from '../constants/schedule';
import type {
  CourseAssignmentPreview,
  CourseDetail,
  CourseHomeSnapshot,
  CourseOutline,
  CourseOutlineNode,
} from '../entity/course';
import { COURSE_ASSIGNMENT_STATUS, COURSE_ROLE } from '../enum';
import type { CreateCourseRequest, ICourseService } from '../service/index.type';
import {
  COURSE_MOCK_ANNOUNCEMENTS,
  COURSE_MOCK_ASSIGNMENTS,
  COURSE_MOCK_DETAILS,
  COURSE_MOCK_MEMBERS,
  COURSE_MOCK_OUTLINES,
} from './courseMockFixtures';
import {
  cloneCourseMockValue,
  countCourseMockReadResources,
  deleteCourseMockOutlineNode,
  findCourseMockOutlineContainer,
  mapCourseDetailToMockGroup,
  mapCourseMockDetailToSummary,
  mapCourseMockOutlineToEditorNodes,
  markCourseMockResourceRead,
  reorderCourseMockOutlineResources,
  reorderCourseMockOutlineSections,
  syncCourseMockBaseInfoFromGroup,
  takeCourseMockOutlineResource,
} from './courseMockModel';

const NETWORK_DELAY_MS = 180;

const delay = async () => new Promise<void>((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

export function createCourseServicesMock(): ICourseService {
  const details = cloneCourseMockValue(COURSE_MOCK_DETAILS);
  const outlines = cloneCourseMockValue(COURSE_MOCK_OUTLINES);
  const assignmentMap = cloneCourseMockValue(COURSE_MOCK_ASSIGNMENTS);

  replaceMockAdvancedGroups(details.map(mapCourseDetailToMockGroup));

  const requireDetail = (courseId: string) => {
    const detail = details.find((item) => item.courseId === courseId);
    if (!detail) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_NOT_FOUND, { courseId });
    }
    syncCourseMockBaseInfoFromGroup(detail);
    detail.teachingWeek = calculateCourseTeachingWeek(detail.startAt, Date.now(), detail.endAt);
    detail.totalTeachingWeeks = calculateCourseTotalTeachingWeeks(detail.startAt, detail.endAt);
    return detail;
  };

  const syncProgress = (courseId: string) => {
    const nodes = outlines[courseId];
    if (!nodes) return;
    const detail = requireDetail(courseId);
    const progress = countCourseMockReadResources(nodes);
    detail.readResourceCount = progress.read;
    detail.totalResourceCount = progress.total;
  };

  return {
    async listMyCourses({ page, size }) {
      await delay();
      details.forEach(syncCourseMockBaseInfoFromGroup);
      const start = Math.max(0, (page - 1) * size);
      return {
        list: details
          .slice(start, start + size)
          .map((item) => cloneCourseMockValue(mapCourseMockDetailToSummary(item))),
        total: details.length,
        page,
        size,
      };
    },

    async getCourseDetail(courseId) {
      await delay();
      syncProgress(courseId);
      return cloneCourseMockValue(requireDetail(courseId));
    },

    async getCourseHome(courseId): Promise<CourseHomeSnapshot> {
      await delay();
      syncProgress(courseId);
      const detail = requireDetail(courseId);
      const pendingAssignments: CourseAssignmentPreview[] = (assignmentMap[courseId] ?? [])
        .filter((item) => item.status === COURSE_ASSIGNMENT_STATUS.PENDING)
        .map(cloneCourseMockValue);
      return {
        progress: {
          readResourceCount: detail.readResourceCount ?? 0,
          totalResourceCount: detail.totalResourceCount ?? 0,
          percent:
            (detail.totalResourceCount ?? 0) > 0
              ? Math.round(
                  ((detail.readResourceCount ?? 0) / (detail.totalResourceCount ?? 1)) * 100
                )
              : 0,
        },
        pendingAssignments,
        announcements: cloneCourseMockValue(COURSE_MOCK_ANNOUNCEMENTS[courseId] ?? []),
      };
    },

    async listCourseAnnouncements(courseId) {
      await delay();
      requireDetail(courseId);
      return cloneCourseMockValue(COURSE_MOCK_ANNOUNCEMENTS[courseId] ?? []).sort(
        (left, right) =>
          Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
          new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime()
      );
    },

    async getCourseOutline(courseId): Promise<CourseOutline> {
      await delay();
      requireDetail(courseId);
      return { courseId, nodes: cloneCourseMockValue(outlines[courseId] ?? []) };
    },

    async setResourceRead({ resourceId }) {
      await delay();
      let found = false;
      for (const nodes of Object.values(outlines)) {
        if (markCourseMockResourceRead(nodes, resourceId)) found = true;
      }
      if (!found) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
          resourceId,
        });
      }
      Object.keys(outlines).forEach(syncProgress);
    },

    async listCourseMembers({ courseId, page, size }) {
      await delay();
      requireDetail(courseId);
      const list = COURSE_MOCK_MEMBERS[courseId] ?? [];
      const start = Math.max(0, (page - 1) * size);
      return {
        members: cloneCourseMockValue(list.slice(start, start + size)),
        total: list.length,
      };
    },

    async createCourse(params: CreateCourseRequest) {
      await delay();
      const courseId = `course-${Date.now()}`;
      const detail: CourseDetail = {
        courseId,
        name: params.name,
        description: params.description,
        term: params.term,
        category: params.category,
        myRole: COURSE_ROLE.TEACHER,
        readResourceCount: 0,
        totalResourceCount: 0,
        pendingAssignmentCount: 0,
        teacherName: '当前教师',
        teacher: { userId: 'mock-current-user', name: '当前教师' },
        learningObjectives: [],
        meetings: [],
        assessmentItems: createDefaultCourseAssessmentItems(),
        memberCount: 1,
      };
      details.unshift(cloneCourseMockValue(detail));
      upsertMockGroup(mapCourseDetailToMockGroup(details[0]));
      outlines[courseId] = [];
      assignmentMap[courseId] = [];
      return courseId;
    },

    async updateCourse(params) {
      await delay();
      const detail = requireDetail(params.courseId);
      detail.name = params.name;
      detail.description = params.description;
      detail.coverUrl = params.coverUrl;
      detail.term = params.term;
      detail.category = params.category;
      detail.startAt = params.startAt;
      detail.endAt = params.endAt;
      detail.learningObjectives = cloneCourseMockValue(params.learningObjectives);
      detail.meetings = cloneCourseMockValue(params.meetings);
      detail.meetingSchedule = params.meetings
        .map(
          (meeting) =>
            `${meeting.weekday} ${formatCoursePeriodRange(meeting.startPeriod, meeting.endPeriod)} ${getCoursePeriodTimeRange(meeting.startPeriod, meeting.endPeriod)}`
        )
        .join('；');
      detail.location = params.meetings
        .map((meeting) => meeting.location)
        .filter(Boolean)
        .join('；');
      detail.assessmentItems = cloneCourseMockValue(params.assessmentItems);
      detail.finalAssessment = params.finalAssessment
        ? cloneCourseMockValue(params.finalAssessment)
        : undefined;
      upsertMockGroup(mapCourseDetailToMockGroup(detail));
    },

    async deleteCourse(courseId) {
      await delay();
      const index = details.findIndex((item) => item.courseId === courseId);
      if (index < 0) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_NOT_FOUND, { courseId });
      }
      details.splice(index, 1);
      delete outlines[courseId];
      delete assignmentMap[courseId];
      removeMockGroup(courseId);
    },

    async getCourseOutlineEditor(courseId) {
      await delay();
      requireDetail(courseId);
      return mapCourseMockOutlineToEditorNodes(cloneCourseMockValue(outlines[courseId] ?? []));
    },

    async createCourseOutlineSection({ courseId, parentId, name }) {
      await delay();
      requireDetail(courseId);
      const nodeId = `section-${Date.now()}`;
      const node: CourseOutlineNode = {
        nodeId,
        nodeType: parentId ? 'SECTION' : 'CHAPTER',
        title: name,
        children: [],
      };
      if (parentId) {
        const parent = findCourseMockOutlineContainer(outlines[courseId] ?? [], parentId);
        if (!parent) {
          throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
            parentId,
          });
        }
        parent.children.push(node);
      } else {
        outlines[courseId] ??= [];
        outlines[courseId].push(node);
      }
      return nodeId;
    },

    async renameCourseOutlineSection({ courseId, nodeId, name }) {
      await delay();
      const node = findCourseMockOutlineContainer(outlines[courseId] ?? [], nodeId);
      if (!node) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { nodeId });
      }
      node.title = name;
    },

    async updateCourseOutlineSectionDescription({ courseId, nodeId, description }) {
      await delay();
      const node = findCourseMockOutlineContainer(outlines[courseId] ?? [], nodeId);
      if (!node) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { nodeId });
      }
      node.description = description || undefined;
    },

    async deleteCourseOutlineSection({ courseId, nodeId }) {
      await delay();
      if (!deleteCourseMockOutlineNode(outlines[courseId] ?? [], nodeId)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { nodeId });
      }
    },

    async reorderCourseOutlineSections({ courseId, orderedNodeIds }) {
      await delay();
      if (!reorderCourseMockOutlineSections(outlines[courseId] ?? [], orderedNodeIds)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND);
      }
    },

    async mountCourseOutlineResources({ courseId, targetNodeId, resources }) {
      await delay();
      const target = findCourseMockOutlineContainer(outlines[courseId] ?? [], targetNodeId);
      if (!target) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
          targetNodeId,
        });
      }
      const mountedResourceIds = new Set(
        target.children
          .filter((node) => node.nodeType === 'RESOURCE')
          .map((node) => node.resourceId)
      );
      target.children.push(
        ...resources
          .filter((resource) => !mountedResourceIds.has(resource.resourceId))
          .map((resource) => ({
            nodeId: `mount-${targetNodeId}-${resource.resourceId}`,
            nodeType: 'RESOURCE' as const,
            title: resource.name,
            resourceId: resource.resourceId,
            resourceType: resource.resourceType,
            read: false,
          }))
      );
      syncProgress(courseId);
    },

    async moveCourseOutlineResource({
      courseId,
      resourceId,
      sourceNodeId,
      targetNodeId,
      orderedResourceIds,
    }) {
      await delay();
      const resource = takeCourseMockOutlineResource(
        outlines[courseId] ?? [],
        resourceId,
        sourceNodeId
      );
      const target = findCourseMockOutlineContainer(outlines[courseId] ?? [], targetNodeId);
      if (!resource || !target) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
          resourceId,
        });
      }
      target.children.push(resource);
      if (orderedResourceIds && !reorderCourseMockOutlineResources(target, orderedResourceIds)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
          targetNodeId,
        });
      }
    },

    async removeCourseOutlineResource({ courseId, resourceId, sourceNodeId }) {
      await delay();
      const resource = takeCourseMockOutlineResource(
        outlines[courseId] ?? [],
        resourceId,
        sourceNodeId
      );
      if (!resource) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
          resourceId,
        });
      }
      syncProgress(courseId);
    },

    async joinCourse({ inviteCode }) {
      await delay();
      if (!inviteCode.trim()) {
        throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'inviteCode' });
      }
    },

    async listCourseAssignments(courseId) {
      await delay();
      requireDetail(courseId);
      return cloneCourseMockValue(assignmentMap[courseId] ?? []);
    },

    async getCourseAssignment(courseId, assignmentId) {
      await delay();
      requireDetail(courseId);
      const assignment = assignmentMap[courseId]?.find(
        (item) => item.assignmentId === assignmentId
      );
      if (!assignment) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_ASSIGNMENT_NOT_FOUND, {
          courseId,
          assignmentId,
        });
      }
      return cloneCourseMockValue(assignment);
    },

    async submitCourseAssignment({ courseId, assignmentId, fileNames }) {
      await delay();
      const detail = requireDetail(courseId);
      const assignment = assignmentMap[courseId]?.find(
        (item) => item.assignmentId === assignmentId
      );
      if (!assignment) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_ASSIGNMENT_NOT_FOUND, {
          courseId,
          assignmentId,
        });
      }
      if (fileNames.length === 0) {
        throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'fileNames' });
      }
      assignment.status = COURSE_ASSIGNMENT_STATUS.SUBMITTED;
      assignment.submittedFileNames = [...fileNames];
      assignment.submittedAt = new Date().toISOString();
      detail.pendingAssignmentCount = (assignmentMap[courseId] ?? []).filter(
        (item) => item.status === COURSE_ASSIGNMENT_STATUS.PENDING
      ).length;
    },
  };
}
