import type { CourseOutlineEditorNode } from '@/domains/Course/entity/course';
import { GROUP_TYPE, type IGroupService } from '@/domains/Group';
import type { IInteractService } from '@/domains/Interact';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
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

const COURSE_RESOURCE_PAGE_SIZE = 100;

const findTag = (nodes: TagTreeNode[], tagId: string): TagTreeNode | undefined => {
  for (const node of nodes) {
    if (node.tagId === tagId) return node;
    const child = findTag(node.children ?? [], tagId);
    if (child) return child;
  }
  return undefined;
};

const mapOutlineEditorNodes = async (
  tagService: ITagService,
  tags: Awaited<ReturnType<ITagService['getTagTree']>>
): Promise<CourseOutlineEditorNode[]> =>
  Promise.all(
    tags.map(async (tag) => {
      const data = await tagService.getResByTag({ tag, filePage: 1, filePageSize: 100 });
      return {
        nodeId: tag.tagId,
        name: tag.tagName,
        entryType: 'folder' as const,
        parentId: tag.parentId,
        children: [
          ...(await mapOutlineEditorNodes(tagService, data.tags)),
          ...CourseServicesMap.sortCourseOutlineResources(data.files, tag.tagMetaInfo).map(
            (resource) => ({
              nodeId: `${tag.tagId}:${resource.resourceId}`,
              name: resource.resourceName,
              entryType: 'resource' as const,
              resourceId: resource.resourceId,
              resourceType: resource.resourceType,
              parentId: tag.tagId,
            })
          ),
        ],
      };
    })
  );

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
    const groups = (await groupService.fetchAllMyGroups()).filter(
      (group) => group.groupType === GROUP_TYPE.ADVANCED
    );
    const start = Math.max(0, (page - 1) * size);
    const pageGroups = groups.slice(start, start + size);
    const list = await Promise.all(
      pageGroups.map(async (group) =>
        CourseServicesMap.mapGroupToCourseSummary(
          group,
          await groupService.fetchMyRoleInGroup(group.groupId)
        )
      )
    );
    return { list, total: groups.length, page, size };
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

  const listCourseOutlineResources = async (courseId: string, tagIds: string[]) => {
    if (tagIds.length === 0) return [];
    const resources: ResourceItem[] = [];
    let page = 1;

    while (true) {
      const result = await resourceService.getGroupResources({
        groupId: courseId,
        page,
        size: COURSE_RESOURCE_PAGE_SIZE,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
        tagIds,
        tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
        includeMyInteraction: true,
      });
      resources.push(...result.list);

      const reachedKnownTotal = result.total > 0 && resources.length >= result.total;
      const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
      const reachedShortPage = result.list.length < COURSE_RESOURCE_PAGE_SIZE;
      if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) break;
      page += 1;
    }

    return resources;
  };

  const findCourseOutlineResourceInTag = async (
    courseId: string,
    tagId: string,
    resourceId: string
  ): Promise<ResourceItem | undefined> => {
    let page = 1;

    while (true) {
      const result = await resourceService.getGroupResources({
        groupId: courseId,
        page,
        size: COURSE_RESOURCE_PAGE_SIZE,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
        tagIds: [tagId],
        tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.AND,
      });
      const resource = result.list.find((item) => item.resourceId === resourceId);
      if (resource) return resource;

      const reachedKnownTotal =
        result.total > 0 && page * COURSE_RESOURCE_PAGE_SIZE >= result.total;
      const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
      const reachedShortPage = result.list.length < COURSE_RESOURCE_PAGE_SIZE;
      if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) return undefined;

      page += 1;
    }
  };

  const getCourseOutline: ICourseService['getCourseOutline'] = async (courseId) => {
    const outlineRoot = await getCourseOutlineRoot(courseId);
    const outlineTags = outlineRoot.children ?? [];
    const tagIds = CourseServicesMap.collectCourseOutlineTagIds(outlineTags);
    const resources = await listCourseOutlineResources(courseId, tagIds);
    return {
      courseId,
      nodes: CourseServicesMap.mapCourseOutlineNodes(outlineTags, resources),
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

  const getCourseOutlineEditor = async (courseId: string): Promise<CourseOutlineEditorNode[]> => {
    const outlineRoot = await getCourseOutlineRoot(courseId);
    const nodes = await mapOutlineEditorNodes(tagService, outlineRoot.children ?? []);
    return nodes.map((node) => ({ ...node, parentId: undefined }));
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

  const updateCourseResourceMount = async (
    courseId: string,
    resourceId: string,
    sourceNodeId: string,
    targetNodeId?: string
  ) => {
    const resource = await findCourseOutlineResourceInTag(courseId, sourceNodeId, resourceId);
    if (!resource) {
      throw createClientError(FRONTEND_CLIENT_ERROR.COURSE_OUTLINE_NODE_NOT_FOUND, { resourceId });
    }
    const remainingTagIds = Object.keys(resource.currentTags ?? {}).filter(
      (tagId) => tagId !== sourceNodeId && tagId !== targetNodeId
    );
    const nextTagIds = targetNodeId ? [targetNodeId, ...remainingTagIds] : remainingTagIds;
    if (targetNodeId !== sourceNodeId) {
      await resourceService.updateResourceTags({
        resourceId,
        groupId: courseId,
        tagIds: nextTagIds,
        ...(resource.mainTagId === sourceNodeId && nextTagIds[0]
          ? { primaryTagId: nextTagIds[0] }
          : {}),
      });
    }
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
      tagService.deleteTag({ groupId: courseId, targetTagId: nodeId }),
    reorderCourseOutlineSections: ({ courseId, orderedNodeIds }) =>
      tagService.reorderSiblingTags({ groupId: courseId, orderedTagIds: orderedNodeIds }),
    mountCourseOutlineResources: ({ courseId, targetNodeId, resources }) =>
      resourceService.mountResourcesToGroupTag({
        groupId: courseId,
        tagId: targetNodeId,
        resourceIds: resources.map((resource) => resource.resourceId),
      }),
    moveCourseOutlineResource: async ({
      courseId,
      resourceId,
      sourceNodeId,
      targetNodeId,
      orderedResourceIds,
    }) => {
      await updateCourseResourceMount(courseId, resourceId, sourceNodeId, targetNodeId);
      if (sourceNodeId !== targetNodeId) {
        await removeCourseOutlineResourceFromOrder(courseId, sourceNodeId, resourceId);
      }
      if (orderedResourceIds) {
        await updateCourseOutlineResourceOrder(courseId, targetNodeId, orderedResourceIds);
      }
    },
    removeCourseOutlineResource: async ({ courseId, resourceId, sourceNodeId }) => {
      await updateCourseResourceMount(courseId, resourceId, sourceNodeId);
      await removeCourseOutlineResourceFromOrder(courseId, sourceNodeId, resourceId);
    },
    joinCourse: (params) => groupService.joinGroup(params),
    listCourseAssignments: unavailable,
    getCourseAssignment: unavailable,
    submitCourseAssignment: unavailable,
  };
};
