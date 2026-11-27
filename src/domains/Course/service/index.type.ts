import type {
  CourseAnnouncement,
  CourseAssessmentItem,
  CourseAssignmentDetail,
  CourseAssignmentPreview,
  CourseDetail,
  CourseFinalAssessment,
  CourseHomeSnapshot,
  CourseMeeting,
  CourseMemberPage,
  CourseOutline,
  CourseOutlineEditorNode,
  CourseOutlineResourceNode,
  CourseResourceSearchHit,
  CourseSummary,
} from '@/domains/Course/entity/course';

export interface CourseListPage {
  list: CourseSummary[];
  total: number;
  page: number;
  size: number;
}

export interface ListMyCoursesRequest {
  page: number;
  size: number;
}

export interface SetCourseResourceReadRequest {
  resourceId: string;
}

export type CourseOutlineReference = Pick<CourseDetail, 'courseId' | 'outlineRootTagId'>;

export interface LoadCourseOutlineResourcesRequest {
  courseId: string;
  nodeId: string;
  resourceOrder: string[];
  cursor?: string;
}

export interface CourseOutlineResourcePage {
  list: CourseOutlineResourceNode[];
  total: number;
  nextCursor?: string;
}

export interface ListCourseMembersRequest {
  courseId: string;
  page: number;
  size: number;
}

export interface CreateCourseRequest {
  name: string;
  description: string;
  term: string;
  category?: string;
}

export interface UpdateCourseRequest {
  courseId: string;
  name: string;
  description: string;
  coverUrl?: string;
  term: string;
  category?: string;
  startAt?: string;
  endAt?: string;
  learningObjectives: string[];
  meetings: CourseMeeting[];
  assessmentItems: CourseAssessmentItem[];
  finalAssessment?: CourseFinalAssessment;
}

export interface CreateCourseOutlineSectionRequest {
  courseId: string;
  parentId?: string;
  name: string;
}

export interface RenameCourseOutlineSectionRequest {
  courseId: string;
  nodeId: string;
  name: string;
}

export interface UpdateCourseOutlineSectionDescriptionRequest {
  courseId: string;
  nodeId: string;
  description: string;
}

export interface DeleteCourseOutlineSectionRequest {
  courseId: string;
  nodeId: string;
}

export interface ReorderCourseOutlineSectionsRequest {
  courseId: string;
  orderedNodeIds: string[];
}

export interface MountCourseOutlineResourcesRequest {
  courseId: string;
  targetNodeId: string;
  resourceIds: string[];
}

export interface MoveCourseOutlineResourceRequest {
  courseId: string;
  resourceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  /** Optional final order for resources in targetNodeId. */
  orderedResourceIds?: string[];
}

export interface RemoveCourseOutlineResourceRequest {
  courseId: string;
  resourceId: string;
  sourceNodeId: string;
  mainTagId?: string;
  currentTagIds: string[];
}

export interface JoinCourseRequest {
  inviteCode: string;
}

/** 第一版临时提交请求；后续由统一作业领域替换。 */
export interface SubmitCourseAssignmentRequest {
  courseId: string;
  assignmentId: string;
  fileNames: string[];
}

export interface ICourseService {
  listMyCourses(params: ListMyCoursesRequest): Promise<CourseListPage>;
  getCourseDetail(courseId: string): Promise<CourseDetail>;
  getCourseHome(course: CourseOutlineReference): Promise<CourseHomeSnapshot>;
  listCourseAnnouncements(courseId: string): Promise<CourseAnnouncement[]>;
  getCourseOutline(course: CourseOutlineReference, refresh?: boolean): Promise<CourseOutline>;
  loadCourseOutlineResources(
    params: LoadCourseOutlineResourcesRequest
  ): Promise<CourseOutlineResourcePage>;
  searchCourseResources(params: {
    courseId: string;
    keyword: string;
    cursor?: string;
  }): Promise<{ list: CourseResourceSearchHit[]; nextCursor: string | null }>;
  getCourseOutlineResource(params: {
    courseId: string;
    tagId: string;
    resourceId: string;
  }): Promise<CourseOutlineResourceNode>;
  setResourceRead(params: SetCourseResourceReadRequest): Promise<void>;
  listCourseMembers(params: ListCourseMembersRequest): Promise<CourseMemberPage>;
  createCourse(params: CreateCourseRequest): Promise<string>;
  updateCourse(params: UpdateCourseRequest): Promise<void>;
  deleteCourse(courseId: string): Promise<void>;
  getCourseOutlineEditor(courseId: string): Promise<CourseOutlineEditorNode[]>;
  createCourseOutlineSection(params: CreateCourseOutlineSectionRequest): Promise<string>;
  renameCourseOutlineSection(params: RenameCourseOutlineSectionRequest): Promise<void>;
  updateCourseOutlineSectionDescription(
    params: UpdateCourseOutlineSectionDescriptionRequest
  ): Promise<void>;
  deleteCourseOutlineSection(params: DeleteCourseOutlineSectionRequest): Promise<void>;
  reorderCourseOutlineSections(params: ReorderCourseOutlineSectionsRequest): Promise<void>;
  mountCourseOutlineResources(params: MountCourseOutlineResourcesRequest): Promise<void>;
  moveCourseOutlineResource(params: MoveCourseOutlineResourceRequest): Promise<void>;
  removeCourseOutlineResource(params: RemoveCourseOutlineResourceRequest): Promise<void>;
  joinCourse(params: JoinCourseRequest): Promise<void>;
  listCourseAssignments(courseId: string): Promise<CourseAssignmentPreview[]>;
  getCourseAssignment(courseId: string, assignmentId: string): Promise<CourseAssignmentDetail>;
  submitCourseAssignment(params: SubmitCourseAssignmentRequest): Promise<void>;
}
