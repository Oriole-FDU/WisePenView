import type {
  CourseAssignmentStatus,
  CourseFinalAssessmentType,
  CourseRole,
  CourseWeekPattern,
} from '@/domains/Course/enum';

export interface CourseTeacher {
  userId: string;
  name: string;
  avatar?: string;
  department?: string;
}

export interface CourseAssessmentItem {
  label: string;
  weight: number;
}

export type CoursePeriod = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface CourseMeeting {
  meetingId: string;
  weekPattern: CourseWeekPattern;
  weekday: string;
  startPeriod: CoursePeriod;
  endPeriod: CoursePeriod;
  location: string;
}

export interface CourseFinalAssessment {
  type: CourseFinalAssessmentType;
  customName?: string;
  examForm?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  deadline?: string;
}

export interface CourseSummary {
  courseId: string;
  name: string;
  description: string;
  coverUrl?: string;
  term: string;
  category?: string;
  myRole: CourseRole;
  /** 聚合查询接入前，真实 Group 列表可能不提供课程进度。 */
  readResourceCount?: number;
  totalResourceCount?: number;
  /** WisePen Form 接入前，真实 Group 列表可能不提供待办数量。 */
  pendingAssignmentCount?: number;
  teacherName: string;
}

export interface CourseDetail extends CourseSummary {
  teacher: CourseTeacher;
  startAt?: string;
  endAt?: string;
  meetingSchedule?: string;
  location?: string;
  learningObjectives: string[];
  assessmentItems: CourseAssessmentItem[];
  meetings: CourseMeeting[];
  finalAssessment?: CourseFinalAssessment;
  outlineRootTagId?: string;
  teachingWeek?: number;
  totalTeachingWeeks?: number;
  memberCount: number;
}

export interface CourseProgress {
  readResourceCount: number;
  totalResourceCount: number;
  percent: number;
}

export interface CourseAnnouncement {
  announcementId: string;
  title: string;
  content: string;
  publisher: CourseTeacher;
  publishTime: string;
  pinned?: boolean;
}

export interface CourseAssignmentPreview {
  assignmentId: string;
  title: string;
  scopeLabel?: string;
  deadline: string;
  status: CourseAssignmentStatus;
}

/** 第一版课程页使用的临时详情模型，不表达作业与大纲的长期关系。 */
export interface CourseAssignmentDetail extends CourseAssignmentPreview {
  description: string;
  score?: number;
  submittedFileNames: string[];
  submittedAt?: string;
}

export interface CourseHomeSnapshot {
  progress: CourseProgress;
  pendingAssignments: CourseAssignmentPreview[];
  announcements: CourseAnnouncement[];
}

interface CourseOutlineNodeBase {
  nodeId: string;
  title: string;
}

export interface CourseOutlineContainerNode extends CourseOutlineNodeBase {
  nodeType: 'CHAPTER' | 'SECTION';
  description?: string;
  children: CourseOutlineNode[];
}

export interface CourseOutlineResourceNode extends CourseOutlineNodeBase {
  nodeType: 'RESOURCE';
  resourceId: string;
  resourceType: string;
  viewer?: string;
  durationLabel?: string;
  read: boolean;
}

export type CourseOutlineNode = CourseOutlineContainerNode | CourseOutlineResourceNode;

export interface CourseOutline {
  courseId: string;
  nodes: CourseOutlineNode[];
}

export interface CourseOutlineEditorNode {
  nodeId: string;
  name: string;
  entryType: 'folder' | 'resource';
  resourceId?: string;
  resourceType?: string;
  parentId?: string;
  children?: CourseOutlineEditorNode[];
}

export interface CourseMember {
  userId: string;
  name: string;
  avatar?: string;
  email: string;
  studentNumber?: string;
  role: CourseRole;
}

export interface CourseMemberPage {
  members: CourseMember[];
  total: number;
}
