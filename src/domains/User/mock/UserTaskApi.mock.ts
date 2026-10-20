import { mockResponse } from '@/domains/_shared/mock/response';

import type { UserTaskApi as UserTaskApiContract } from '../apis/UserTaskApi';

let checkedInToday = false;
let cycleProgress = 0;

export const UserTaskApi: typeof UserTaskApiContract = {
  listTaskStatus: () =>
    mockResponse([
      {
        taskCode: 'DAILY_CHECK_IN',
        taskType: 'PERIODIC',
        enabled: true,
        canComplete: !checkedInToday,
        rewardPreview: {
          rewardType: 'TOKEN',
          rewardAmount: null,
          minRewardAmount: 100000,
          maxRewardAmount: 1000000,
          rewardStepAmount: 100000,
        },
        once: null,
        periodic: {
          completedTimes: checkedInToday ? 1 : 0,
          maxTimes: 1,
          windowStart: new Date('2026-09-19T00:00:00').getTime(),
          windowEnd: new Date('2026-09-20T00:00:00').getTime(),
          lastCompleteTime: checkedInToday ? new Date('2026-09-19T09:00:00').getTime() : null,
        },
      },
    ]),
  dailyCheckIn: async () => {
    checkedInToday = true;
    cycleProgress = Math.min(cycleProgress + 1, 10);
    return mockResponse({
      rewardType: 'TOKEN',
      rewardAmount: 100000,
      hitGuarantee: cycleProgress === 10,
      cycleProgress,
      cycleCount: 10,
      checkedInToday: true,
    });
  },
};
