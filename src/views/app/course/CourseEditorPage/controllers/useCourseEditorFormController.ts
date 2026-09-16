import { toast } from '@heroui/react';
import { type SyntheticEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCourseService, useImageService } from '@/domains';
import type { CourseAssessmentItem, CourseDetail, CourseMeeting } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { PLACEHOLDER_IMAGE } from '@/utils/image/placeholder';
import { assertImageProxyUploadLimit } from '@/utils/image/uploadLimit';

import {
  mapCourseDetailToEditorForm,
  mapCourseEditorFormToUpdateRequest,
} from '../courseEditorForm.mapper';
import { type CourseEditorForm, getCourseAssessmentTotal } from '../model';

interface UseCourseEditorFormControllerParams {
  course: CourseDetail;
  refreshCourse: () => void;
}

export function useCourseEditorFormController({
  course,
  refreshCourse,
}: UseCourseEditorFormControllerParams) {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const imageService = useImageService();
  const [form, setForm] = useState<CourseEditorForm>(() => mapCourseDetailToEditorForm(course));
  const [saved, setSaved] = useState(true);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modalCoverFile, setModalCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>();
  const coverPreviewRequestRef = useRef(0);

  const { loading: saving, run: saveCourse } = useApi(
    async () => {
      let coverUrl = form.coverUrl.trim() || undefined;
      if (coverFile) {
        const uploadResult = await imageService.uploadImage({
          file: coverFile,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${course.courseId}`,
        });
        coverUrl = uploadResult.publicUrl;
      }
      await courseService.updateCourse(
        mapCourseEditorFormToUpdateRequest({
          courseId: course.courseId,
          coverUrl,
          form,
        })
      );
      return coverUrl;
    },
    {
      manual: true,
      onSuccess: (coverUrl) => {
        coverPreviewRequestRef.current += 1;
        setCoverFile(null);
        setCoverPreview(coverUrl);
        setForm((current) => ({ ...current, coverUrl: coverUrl ?? '' }));
        setSaved(true);
        refreshCourse();
        toast.success(t('editor.saveSuccess'));
      },
    }
  );

  const updateForm = <K extends keyof CourseEditorForm>(key: K, value: CourseEditorForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.term.trim()) {
      toast.warning(t('editor.required'));
      return;
    }
    saveCourse();
  };

  const handleCoverFileChange = (file: File | null) => {
    if (!file) {
      setModalCoverFile(null);
      return;
    }
    try {
      assertImageProxyUploadLimit(file);
      setModalCoverFile(file);
    } catch (error: unknown) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const handleConfirmCover = () => {
    if (!modalCoverFile) return;
    setCoverFile(modalCoverFile);
    const requestId = coverPreviewRequestRef.current + 1;
    coverPreviewRequestRef.current = requestId;
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== coverPreviewRequestRef.current || typeof reader.result !== 'string') return;
      setCoverPreview(reader.result);
      setSaved(false);
    };
    reader.readAsDataURL(modalCoverFile);
    setModalCoverFile(null);
    setCoverModalOpen(false);
  };

  const handleCoverModalOpenChange = (open: boolean) => {
    setCoverModalOpen(open);
    if (!open) setModalCoverFile(null);
  };

  const handleCoverImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const updateMeeting = (meetingId: string, patch: Partial<CourseMeeting>) => {
    updateForm(
      'meetings',
      form.meetings.map((meeting) =>
        meeting.meetingId === meetingId ? { ...meeting, ...patch } : meeting
      )
    );
  };

  const updateAssessment = (editorId: string, patch: Partial<CourseAssessmentItem>) => {
    updateForm(
      'assessmentItems',
      form.assessmentItems.map((item) =>
        item.editorId === editorId ? { ...item, ...patch } : item
      )
    );
  };

  const updateDeadlineDate = (value: string) => {
    updateForm('finalAssessment', {
      ...form.finalAssessment,
      deadline: value ? `${value}T${form.finalAssessmentDeadlineTime}` : undefined,
    });
  };

  const updateDeadlineTime = (value: string) => {
    const nextTime = value || '23:59';
    setForm((current) => {
      const deadlineDate = current.finalAssessment.deadline?.split('T')[0];
      return {
        ...current,
        finalAssessmentDeadlineTime: nextTime,
        finalAssessment: deadlineDate
          ? { ...current.finalAssessment, deadline: `${deadlineDate}T${nextTime}` }
          : current.finalAssessment,
      };
    });
    setSaved(false);
  };

  const noFinalAssessmentValue = t('editor.assessment.noneValue');
  return {
    form,
    updateForm,
    updateMeeting,
    updateAssessment,
    updateDeadlineDate,
    updateDeadlineTime,
    assessmentTotal: getCourseAssessmentTotal(form.assessmentItems),
    noFinalAssessmentValue,
    hasNoFinalAssessment:
      form.finalAssessment.type === 'OTHER' &&
      form.finalAssessment.customName?.trim() === noFinalAssessmentValue,
    saved,
    saving,
    handleSave,
    cover: {
      isOpen: coverModalOpen,
      modalFile: modalCoverFile,
      displayUrl: coverPreview ?? (form.coverUrl || PLACEHOLDER_IMAGE),
      handleOpenChange: handleCoverModalOpenChange,
      handleFileChange: handleCoverFileChange,
      handleConfirm: handleConfirmCover,
      handleImageError: handleCoverImageError,
    },
  };
}
