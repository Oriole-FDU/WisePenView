import { useState } from 'react';
import { useMatch } from 'react-router-dom';

import { GuideScope } from '@/components/base/Guide';
import { GUIDE_TOUR_ID, type GuideTourId } from '@/constants/tour';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

/** 课程资源引导从课程主页开始登记；后续切换资料、人员时保持挂载。 */
function CourseTourScope() {
  const isCourseHome = useMatch(`${APP_ROUTE_PATH.COURSES}/:courseId/home`) !== null;
  const [tourId] = useState<GuideTourId | undefined>(() =>
    isCourseHome ? GUIDE_TOUR_ID.courseResources : undefined
  );

  return <GuideScope tourId={tourId}>{null}</GuideScope>;
}

export default CourseTourScope;
