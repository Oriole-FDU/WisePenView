import { ListBox } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { Input, Select } from '@/components/base/Input';
import {
  type CourseMeeting,
  type CoursePeriod,
  type CourseWeekPattern,
  FUDAN_COURSE_PERIODS,
  getCoursePeriodTimeRange,
  isCoursePeriod,
} from '@/domains/Course';

import {
  COURSE_WEEK_PATTERNS,
  COURSE_WEEKDAYS,
  type CourseEditorForm,
  createCourseMeeting,
  type UpdateCourseEditorForm,
} from '../../model';
import styles from '../../style.module.less';
import { CourseDateRangeField } from '../CourseEditorDateFields';

interface CourseScheduleSectionProps {
  form: CourseEditorForm;
  onUpdate: UpdateCourseEditorForm;
  onUpdateMeeting: (meetingId: string, patch: Partial<CourseMeeting>) => void;
}

function CourseScheduleSection({ form, onUpdate, onUpdateMeeting }: CourseScheduleSectionProps) {
  const { t } = useTranslation('course');

  return (
    <section id="course-editor-schedule" className={styles.editorSection}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{t('editor.schedule.title')}</h2>
          <p>{t('editor.schedule.description')}</p>
        </div>
      </div>
      <div className={styles.dateRangeField}>
        <CourseDateRangeField
          label={t('editor.fields.coursePeriod')}
          startValue={form.startAt}
          endValue={form.endAt}
          onChange={(startValue, endValue) => {
            onUpdate('startAt', startValue);
            onUpdate('endAt', endValue);
          }}
        />
        <AppButton
          variant="outline"
          size="sm"
          isDisabled={!form.startAt && !form.endAt}
          onPress={() => {
            onUpdate('startAt', '');
            onUpdate('endAt', '');
          }}
        >
          {t('editor.actions.clear')}
        </AppButton>
      </div>
      <div className={styles.subsectionHead}>
        <div>
          <h3>{t('editor.schedule.meetings')}</h3>
          <p>{t('editor.schedule.meetingsHint')}</p>
        </div>
        <AppButton
          variant="secondary"
          onPress={() => onUpdate('meetings', [...form.meetings, createCourseMeeting()])}
        >
          <Plus size={16} aria-hidden />
          {t('editor.actions.addMeeting')}
        </AppButton>
      </div>
      <div className={styles.meetingList}>
        <div className={styles.meetingColumns} aria-hidden>
          <span>{t('editor.fields.weekPattern')}</span>
          <span>{t('editor.fields.weekday')}</span>
          <span>{t('editor.fields.startPeriod')}</span>
          <span>{t('editor.fields.endPeriod')}</span>
          <span>{t('editor.fields.periodTime')}</span>
          <span>{t('editor.fields.location')}</span>
          <span />
        </div>
        {form.meetings.map((meeting) => (
          <div key={meeting.meetingId} className={styles.meetingRow}>
            <Select
              variant="secondary"
              value={meeting.weekPattern}
              onChange={(value) => {
                if (typeof value !== 'string') return;
                onUpdateMeeting(meeting.meetingId, {
                  weekPattern: value as CourseWeekPattern,
                });
              }}
              aria-label={t('editor.fields.weekPattern')}
            >
              <Select.Trigger className={styles.meetingControl}>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {COURSE_WEEK_PATTERNS.map((item) => (
                    <ListBox.Item key={item} id={item}>
                      {t(`editor.weekPattern.${item}`)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              variant="secondary"
              value={meeting.weekday}
              onChange={(value) => {
                if (typeof value !== 'string') return;
                onUpdateMeeting(meeting.meetingId, { weekday: value });
              }}
              aria-label={t('editor.fields.weekday')}
            >
              <Select.Trigger className={styles.meetingControl}>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {COURSE_WEEKDAYS.map((item) => (
                    <ListBox.Item key={item} id={item}>
                      {item}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              variant="secondary"
              value={String(meeting.startPeriod)}
              onChange={(value) => {
                const startPeriod = Number(value);
                if (!isCoursePeriod(startPeriod)) return;
                const endPeriod = Math.max(startPeriod, meeting.endPeriod) as CoursePeriod;
                onUpdateMeeting(meeting.meetingId, { startPeriod, endPeriod });
              }}
              aria-label={t('editor.fields.startPeriod')}
            >
              <Select.Trigger className={styles.meetingControl}>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {FUDAN_COURSE_PERIODS.map(({ period }) => (
                    <ListBox.Item key={period} id={String(period)}>
                      {t('editor.fields.periodOption', { period })}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              variant="secondary"
              value={String(meeting.endPeriod)}
              onChange={(value) => {
                const endPeriod = Number(value);
                if (!isCoursePeriod(endPeriod)) return;
                onUpdateMeeting(meeting.meetingId, { endPeriod });
              }}
              aria-label={t('editor.fields.endPeriod')}
            >
              <Select.Trigger className={styles.meetingControl}>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {FUDAN_COURSE_PERIODS.filter(({ period }) => period >= meeting.startPeriod).map(
                    ({ period }) => (
                      <ListBox.Item key={period} id={String(period)}>
                        {t('editor.fields.periodOption', { period })}
                      </ListBox.Item>
                    )
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <span className={styles.meetingTime}>
              {getCoursePeriodTimeRange(meeting.startPeriod, meeting.endPeriod)}
            </span>
            <Input
              className={styles.meetingControl}
              value={meeting.location}
              placeholder={t('editor.fields.location')}
              aria-label={t('editor.fields.location')}
              onChange={(event) =>
                onUpdateMeeting(meeting.meetingId, { location: event.target.value })
              }
            />
            <AppIconButton
              icon={<Trash2 aria-hidden />}
              label={t('editor.actions.deleteMeeting')}
              variant="danger"
              onPress={() =>
                onUpdate(
                  'meetings',
                  form.meetings.filter((item) => item.meetingId !== meeting.meetingId)
                )
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default CourseScheduleSection;
