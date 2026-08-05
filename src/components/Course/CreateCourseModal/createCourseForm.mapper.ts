import type { CreateCourseRequest } from '@/domains/Course';

export interface CourseCreateForm {
  name: string;
  description: string;
  term: string;
  category: string;
}

export const EMPTY_COURSE_CREATE_FORM: CourseCreateForm = {
  name: '',
  description: '',
  term: '',
  category: '',
};

export const mapCourseCreateFormToRequest = (form: CourseCreateForm): CreateCourseRequest => ({
  name: form.name.trim(),
  description: form.description.trim(),
  term: form.term.trim(),
  category: form.category.trim() || undefined,
});
