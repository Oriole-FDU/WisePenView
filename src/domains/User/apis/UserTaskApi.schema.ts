import { z } from 'zod';

import { EpochMillisSchema } from '@/apis/schema';

export const UserTaskCodeApiSchema = z.enum([
  'DAILY_CHECK_IN',
  'STUDENT_VERIFICATION',
  'TEACHER_VERIFICATION',
  'INVITE_VERIFIED_USER',
]);

export const UserTaskTypeApiSchema = z.enum(['ONCE', 'PERIODIC', 'UNCHECKED']);

export const RewardTypeApiSchema = z.enum(['TOKEN', 'COIN', 'NONE']);

export const UserTaskRewardPreviewApiSchema = z.object({
  rewardType: RewardTypeApiSchema,
  rewardAmount: z.number().int().nullable(),
  minRewardAmount: z.number().int().nullable(),
  maxRewardAmount: z.number().int().nullable(),
  rewardStepAmount: z.number().int().nullable(),
});

export const UserTaskOnceStatusApiSchema = z.object({
  completed: z.boolean(),
  completeTime: EpochMillisSchema.nullable(),
});

export const UserTaskPeriodicStatusApiSchema = z.object({
  completedTimes: z.number().int().nonnegative(),
  maxTimes: z.number().int().nonnegative(),
  windowStart: EpochMillisSchema.nullable(),
  windowEnd: EpochMillisSchema.nullable(),
  lastCompleteTime: EpochMillisSchema.nullable(),
});

export const UserTaskStatusApiSchema = z.object({
  taskCode: UserTaskCodeApiSchema,
  taskType: UserTaskTypeApiSchema,
  enabled: z.boolean(),
  canComplete: z.boolean(),
  rewardPreview: UserTaskRewardPreviewApiSchema.nullable(),
  once: UserTaskOnceStatusApiSchema.nullable(),
  periodic: UserTaskPeriodicStatusApiSchema.nullable(),
});

export const ListUserTaskStatusApiResponseSchema = z.array(UserTaskStatusApiSchema);

export const UserTaskCheckInApiSchema = z.object({
  rewardType: RewardTypeApiSchema,
  rewardAmount: z.number().int().nonnegative(),
  hitGuarantee: z.boolean(),
  cycleProgress: z.number().int().nonnegative(),
  cycleCount: z.number().int().nonnegative(),
  checkedInToday: z.boolean(),
});

export type UserTaskStatusApiResponse = z.infer<typeof UserTaskStatusApiSchema>;
export type UserTaskCheckInApiResponse = z.infer<typeof UserTaskCheckInApiSchema>;
export type UserTaskRewardPreviewApiResponse = z.infer<typeof UserTaskRewardPreviewApiSchema>;
export type UserTaskPeriodicStatusApiResponse = z.infer<typeof UserTaskPeriodicStatusApiSchema>;
