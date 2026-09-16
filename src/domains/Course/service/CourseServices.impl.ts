import { GROUP_TYPE, type IGroupService } from '@/domains/Group';
import type { IInteractService } from '@/domains/Interact';
import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { CourseServicesMap } from '../mapper/CourseServices.map';
import type {
  CreateCourseRequest,
  ICourseService,
  ListCourseMembersRequest,
  ListMyCoursesRequest,
  UpdateCourseRequest,
} from './index.type';

const unavailable = async (..._args: unknown[]): Promise<never> => {
  throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_SERVICE_UNAVAILABLE);
};

const COURSE_RESOURCE_PAGE_SIZE = 50;
const normalizeResourceIds = (resourceIds: string[]): string[] => [
  ...new Set(resourceIds.map((resourceId) => resourceId.trim()).filter(Boolean)),
];

const findTag = (nodes: TagTreeNode[], tagId: string): TagTreeNode | undefined => {
  for (const node of nodes) {
    if (node.tagId === tagId) return node;
    const child = findTag(node.children ?? [], tagId);
    if (child) return child;
  }
  return undefined;
};

const parseCourseResourceCursor = (cursor?: string): number => {
  if (!cursor) return 1;
  const page = Number(cursor);
  if (!Number.isInteger(page) || page < 1) {
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'cursor' });
  }
  return page;
};

interface CourseServicesDeps {
  groupService: IGroupService;
  interactService: IInteractService;
  resourceService: IResourceService;
  tagService: ITagService;
}

/** Course 是高级组的前端聚合视图，不拥有独立 API。 */
export const createCourseServices = (deps: CourseServicesDeps): ICourseService => {
  const { groupService, interactService, resourceService, tagService } = deps;

  const listMyCourses = async ({ page, size }: ListMyCoursesRequest) => {
    const data = await groupService.fetchGroupList({
      groupRoleFilter: 'ALL',
      groupType: GROUP_TYPE.ADVANCED,
      page,
      size,
    });
    return {
      list: data.groups.map(CourseServicesMap.mapGroupToCourseSummary),
      total: data.total,
      page: data.page,
      size: data.size,
    };
  };

  const getCourseDetail = async (courseId: string) => {
    const group = await groupService.fetchGroupInfo(courseId);
    if (group.groupType !== GROUP_TYPE.ADVANCED) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_NOT_FOUND, { courseId });
    }
    const role = await groupService.fetchMyRoleInGroup(courseId);
    return CourseServicesMap.mapGroupToCourseDetail(group, role);
  };

  const createCourse = async (params: CreateCourseRequest): Promise<string> => {
    const initialMetaInfo = CourseServicesMap.serializeCourseMeta(params);
    const courseId = await groupService.createGroup({
      groupName: params.name,
      groupType: GROUP_TYPE.ADVANCED,
      groupDesc: params.description,
      groupMetaInfo: initialMetaInfo,
    });
    const outlineRootTagId = await tagService.addTag({
      groupId: courseId,
      tagName: '大纲内容',
    });
    await groupService.editGroup({
      groupId: courseId,
      groupName: params.name,
      groupDesc: params.description,
      groupMetaInfo: CourseServicesMap.serializeCourseMeta({ ...params, outlineRootTagId }),
      groupCoverUrl: '',
      groupType: GROUP_TYPE.ADVANCED,
    });
    return courseId;
  };

  const updateCourse = async (params: UpdateCourseRequest): Promise<void> => {
    const group = await groupService.fetchGroupInfo(params.courseId);
    const currentCourseMeta = CourseServicesMap.parseCourseMeta(group.groupMetaInfo);
    await groupService.editGroup({
      groupId: params.courseId,
      groupName: params.name,
      groupDesc: params.description,
      groupCoverUrl: params.coverUrl ?? group.groupCoverUrl,
      groupType: GROUP_TYPE.ADVANCED,
      groupMetaInfo: CourseServicesMap.serializeCourseMeta(
        {
          ...params,
          outlineRootTagId: currentCourseMeta.outlineRootTagId,
        },
        group.groupMetaInfo
      ),
    });
  };

  const deleteCourse = async (courseId: string): Promise<void> => {
    await groupService.deleteGroup({ groupId: courseId });
  };

  const getCourseOutlineRoot = async (courseId: string): Promise<TagTreeNode> => {
    const [group, tags] = await Promise.all([
      groupService.fetchGroupInfo(courseId),
      tagService.getTagTree(courseId),
    ]);
    if (group.groupType !== GROUP_TYPE.ADVANCED) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_NOT_FOUND, { courseId });
    }
    const outlineRootTagId = CourseServicesMap.parseCourseMeta(
      group.groupMetaInfo
    ).outlineRootTagId;
    if (!outlineRootTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { courseId });
    }
    const outlineRoot = findTag(tags, outlineRootTagId);
    if (!outlineRoot) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
        courseId,
        outlineRootTagId,
      });
    }
    return outlineRoot;
  };

  const getCourseOutline: ICourseService['getCourseOutline'] = async (courseId) => {
    const outlineRoot = await getCourseOutlineRoot(courseId);
    const outlineTags = outlineRoot.children ?? [];
    return {
      courseId,
      nodes: CourseServicesMap.mapCourseOutlineNodes(outlineTags),
    };
  };

  const loadCourseOutlineResources: ICourseService['loadCourseOutlineResources'] = async ({
    courseId,
    nodeId,
    cursor,
  }) => {
    const outlineRoot = await getCourseOutlineRoot(courseId);
    const tag = findTag(outlineRoot.children ?? [], nodeId);
    if (!tag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { nodeId });
    }
    const page = parseCourseResourceCursor(cursor);
    const result = await resourceService.getGroupResources({
      groupId: courseId,
      page,
      size: COURSE_RESOURCE_PAGE_SIZE,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [nodeId],
      tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.AND,
      includeMyInteraction: true,
    });
    const resolvedPage = Math.max(1, result.page || page);
    const resolvedTotal = Math.max(0, result.total || 0);
    const resolvedTotalPage = Math.max(0, result.totalPage || 0);
    const hasMore =
      resolvedTotalPage > 0
        ? resolvedPage < resolvedTotalPage
        : resolvedPage * COURSE_RESOURCE_PAGE_SIZE < resolvedTotal;
    return {
      list: CourseServicesMap.mapCourseOutlineResourceNodes(result.list, nodeId, tag.tagMetaInfo),
      total: resolvedTotal,
      ...(hasMore ? { nextCursor: String(resolvedPage + 1) } : {}),
    };
  };

  const getCourseHome: ICourseService['getCourseHome'] = async (courseId) => {
    const outline = await getCourseOutline(courseId);
    return {
      progress: CourseServicesMap.calculateCourseOutlineProgress(outline.nodes),
      pendingAssignments: [],
      announcements: [],
    };
  };

  const getCourseOutlineEditor: ICourseService['getCourseOutlineEditor'] = async (courseId) => {
    const outline = await getCourseOutline(courseId);
    return CourseServicesMap.mapCourseOutlineEditorNodes(outline.nodes);
  };

  const createCourseOutlineSection: ICourseService['createCourseOutlineSection'] = async ({
    courseId,
    parentId,
    name,
  }) => {
    let targetParentId = parentId;
    if (!targetParentId) {
      const group = await groupService.fetchGroupInfo(courseId);
      targetParentId = CourseServicesMap.parseCourseMeta(group.groupMetaInfo).outlineRootTagId;
      if (!targetParentId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_NOT_FOUND, { courseId });
      }
    }
    return tagService.addTag({ groupId: courseId, parentId: targetParentId, tagName: name });
  };

  const updateCourseOutlineResourceOrder = async (
    courseId: string,
    tagId: string,
    orderedResourceIds: string[]
  ): Promise<void> => {
    const tags = await tagService.getTagTree(courseId);
    const tag = findTag(tags, tagId);
    if (!tag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
        nodeId: tagId,
      });
    }
    await tagService.updateTag({
      groupId: courseId,
      targetTagId: tagId,
      tagMetaInfo: CourseServicesMap.mapCourseOutlineResourceOrderMeta(
        tag.tagMetaInfo,
        orderedResourceIds
      ),
    });
  };

  const mountCourseOutlineResources: ICourseService['mountCourseOutlineResources'] = async ({
    courseId,
    targetNodeId,
    resourceIds,
  }) => {
    const normalizedResourceIds = normalizeResourceIds(resourceIds);
    if (normalizedResourceIds.length === 0) return;

    const targetTag = await getCourseOutlineRoot(courseId).then((outlineRoot) =>
      findTag(outlineRoot.children ?? [], targetNodeId)
    );
    if (!targetTag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, {
        nodeId: targetNodeId,
      });
    }

    await resourceService.mountResourcesToGroup({
      resourceIds: normalizedResourceIds,
      groupId: courseId,
      targetTagId: targetNodeId,
    });

    const persistedOrder = CourseServicesMap.getCourseOutlineResourceOrder(targetTag.tagMetaInfo);
    await updateCourseOutlineResourceOrder(
      courseId,
      targetNodeId,
      normalizeResourceIds([...persistedOrder, ...normalizedResourceIds])
    );
  };

  const removeCourseOutlineResourceFromOrder = async (
    courseId: string,
    tagId: string,
    resourceId: string
  ): Promise<void> => {
    const tags = await tagService.getTagTree(courseId);
    const tag = findTag(tags, tagId);
    if (!tag) return;
    const resourceOrder = CourseServicesMap.getCourseOutlineResourceOrder(tag.tagMetaInfo);
    const nextOrder = resourceOrder.filter((item) => item !== resourceId);
    if (nextOrder.length === resourceOrder.length) return;
    await updateCourseOutlineResourceOrder(courseId, tagId, nextOrder);
  };

  const moveCourseOutlineResource: ICourseService['moveCourseOutlineResource'] = async ({
    courseId,
    resourceId,
    sourceNodeId,
    targetNodeId,
    orderedResourceIds,
  }) => {
    if (sourceNodeId !== targetNodeId) {
      await resourceService.moveResourcesInGroup({
        groupId: courseId,
        resourceSourceTagMap: { [resourceId]: sourceNodeId },
        targetTagId: targetNodeId,
      });
      await removeCourseOutlineResourceFromOrder(courseId, sourceNodeId, resourceId);
    }
    if (orderedResourceIds) {
      await updateCourseOutlineResourceOrder(
        courseId,
        targetNodeId,
        normalizeResourceIds(orderedResourceIds)
      );
    }
  };

  const removeCourseOutlineResource: ICourseService['removeCourseOutlineResource'] = async ({
    courseId,
    resourceId,
    sourceNodeId,
    mainTagId,
    currentTagIds,
  }) => {
    const outlineRoot = await getCourseOutlineRoot(courseId);
    const outlineTagIds = new Set(
      CourseServicesMap.collectCourseOutlineTagIds(outlineRoot.children ?? [])
    );
    const remainingTagIds = currentTagIds.filter(
      (tagId) => tagId !== sourceNodeId && outlineTagIds.has(tagId)
    );

    if (mainTagId === sourceNodeId && remainingTagIds.length > 0) {
      await resourceService.moveResourcesInGroup({
        groupId: courseId,
        resourceSourceTagMap: { [resourceId]: sourceNodeId },
        targetTagId: remainingTagIds[0],
      });
    } else {
      await resourceService.unmountResourcesToGroup({
        groupId: courseId,
        resourceSourceTagMap: { [resourceId]: sourceNodeId },
      });
    }
    await removeCourseOutlineResourceFromOrder(courseId, sourceNodeId, resourceId);
  };

  const listCourseMembers = async ({ courseId, page, size }: ListCourseMembersRequest) => {
    const groupMembers = await groupService.fetchGroupMembers(courseId, page, size);
    return {
      members: groupMembers.members.map(CourseServicesMap.mapGroupMemberToCourseMember),
      total: groupMembers.total,
    };
  };

  return {
    listMyCourses,
    getCourseDetail,
    getCourseHome,
    listCourseAnnouncements: unavailable,
    getCourseOutline,
    loadCourseOutlineResources,
    setResourceRead: ({ resourceId }) => interactService.recordResourceRead(resourceId),
    listCourseMembers,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseOutlineEditor,
    createCourseOutlineSection,
    renameCourseOutlineSection: ({ courseId, nodeId, name }) =>
      tagService.updateTag({ groupId: courseId, targetTagId: nodeId, tagName: name }),
    updateCourseOutlineSectionDescription: ({ courseId, nodeId, description }) =>
      tagService.updateTag({ groupId: courseId, targetTagId: nodeId, tagDesc: description }),
    deleteCourseOutlineSection: ({ courseId, nodeId }) =>
      tagService.removeTags({ groupId: courseId, targetTagIds: [nodeId] }),
    reorderCourseOutlineSections: ({ courseId, orderedNodeIds }) =>
      tagService.reorderSiblingTags({ groupId: courseId, orderedTagIds: orderedNodeIds }),
    mountCourseOutlineResources,
    moveCourseOutlineResource,
    removeCourseOutlineResource,
    joinCourse: (params) => groupService.joinGroup(params),
    listCourseAssignments: unavailable,
    getCourseAssignment: unavailable,
    submitCourseAssignment: unavailable,
  };
};
