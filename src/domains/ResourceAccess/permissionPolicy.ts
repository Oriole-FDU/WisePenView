import type { ResourcePermissionSubject } from './service/index.type';

/** 这里只判断编辑所需数据是否完整，实际授权仍由后端执行。 */
export const canEditResourcePermissionSubject = (subject: ResourcePermissionSubject): boolean =>
  (subject.source !== 'tag' && !subject.primaryTagId) || subject.inheritance?.status === 'ready';
