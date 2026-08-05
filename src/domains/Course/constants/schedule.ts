import type { CoursePeriod } from '@/domains/Course/entity/course';

interface CoursePeriodTime {
  period: CoursePeriod;
  startTime: string;
  endTime: string;
}

export const FUDAN_COURSE_PERIODS = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '09:55', endTime: '10:40' },
  { period: 4, startTime: '10:50', endTime: '11:35' },
  { period: 5, startTime: '11:45', endTime: '12:30' },
  { period: 6, startTime: '13:30', endTime: '14:15' },
  { period: 7, startTime: '14:25', endTime: '15:10' },
  { period: 8, startTime: '15:25', endTime: '16:10' },
  { period: 9, startTime: '16:20', endTime: '17:05' },
  { period: 10, startTime: '17:15', endTime: '18:00' },
  { period: 11, startTime: '18:30', endTime: '19:15' },
  { period: 12, startTime: '19:25', endTime: '20:10' },
  { period: 13, startTime: '20:20', endTime: '21:05' },
  { period: 14, startTime: '21:15', endTime: '22:00' },
] as const satisfies readonly CoursePeriodTime[];

export const isCoursePeriod = (value: unknown): value is CoursePeriod =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 14;

export const formatCoursePeriodRange = (startPeriod: CoursePeriod, endPeriod: CoursePeriod) => {
  const periods = Array.from(
    { length: endPeriod - startPeriod + 1 },
    (_, index) => startPeriod + index
  );
  return `${periods.join('、')}节`;
};

export const getCoursePeriodTimeRange = (
  startPeriod: CoursePeriod,
  endPeriod: CoursePeriod
): string => {
  const start = FUDAN_COURSE_PERIODS.find((item) => item.period === startPeriod);
  const end = FUDAN_COURSE_PERIODS.find((item) => item.period === endPeriod);
  if (!start || !end || endPeriod < startPeriod) return '';
  return `${start.startTime}–${end.endTime}`;
};

const parseCourseDateStart = (value?: string): number | undefined => {
  if (!value) return undefined;
  const time = new Date(`${value.slice(0, 10)}T00:00:00`).getTime();
  return Number.isNaN(time) ? undefined : time;
};

export const calculateCourseTotalTeachingWeeks = (
  startAt?: string,
  endAt?: string
): number | undefined => {
  const startTime = parseCourseDateStart(startAt);
  const endTime = parseCourseDateStart(endAt);
  if (startTime === undefined || endTime === undefined || endTime < startTime) return undefined;
  const inclusiveDays = Math.floor((endTime - startTime) / 86_400_000) + 1;
  return Math.max(1, Math.ceil(inclusiveDays / 7));
};

export const calculateCourseTeachingWeek = (
  startAt?: string,
  currentTime = Date.now(),
  endAt?: string
): number | undefined => {
  const startTime = parseCourseDateStart(startAt);
  if (startTime === undefined) return undefined;
  const elapsedDays = Math.floor((currentTime - startTime) / 86_400_000);
  if (elapsedDays < 0) return undefined;
  const currentWeek = Math.floor(elapsedDays / 7) + 1;
  const totalWeeks = calculateCourseTotalTeachingWeeks(startAt, endAt);
  return totalWeeks === undefined ? currentWeek : Math.min(totalWeeks, currentWeek);
};
