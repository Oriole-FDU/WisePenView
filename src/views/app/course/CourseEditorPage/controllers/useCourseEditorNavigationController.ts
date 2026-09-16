import { useUnmount } from 'ahooks';
import { type UIEvent, useRef, useState } from 'react';

import { COURSE_EDITOR_SECTION_IDS, type CourseEditorSectionId } from '../model';

export function useCourseEditorNavigationController() {
  const [activeSection, setActiveSection] = useState<CourseEditorSectionId>(
    COURSE_EDITOR_SECTION_IDS[0]
  );
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const programmaticScrollTargetRef = useRef<CourseEditorSectionId | null>(null);
  const programmaticScrollReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setEditorScrollElement = (element: HTMLElement | null) => {
    editorScrollRef.current = element;
  };

  useUnmount(() => {
    if (programmaticScrollReleaseTimerRef.current) {
      clearTimeout(programmaticScrollReleaseTimerRef.current);
      programmaticScrollReleaseTimerRef.current = null;
    }
  });

  const navigateToSection = (sectionId: CourseEditorSectionId) => {
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    const scrollContainer = editorScrollRef.current;
    if (!section || !scrollContainer) return;

    const activationLine = scrollContainer.getBoundingClientRect().top + 32;
    if (programmaticScrollReleaseTimerRef.current) {
      clearTimeout(programmaticScrollReleaseTimerRef.current);
      programmaticScrollReleaseTimerRef.current = null;
    }
    if (Math.abs(section.getBoundingClientRect().top - activationLine) <= 4) {
      programmaticScrollTargetRef.current = null;
    } else {
      programmaticScrollTargetRef.current = sectionId;
      programmaticScrollReleaseTimerRef.current = setTimeout(() => {
        programmaticScrollTargetRef.current = null;
        programmaticScrollReleaseTimerRef.current = null;
      }, 800);
    }
    const sectionOffsetTop =
      section.getBoundingClientRect().top -
      scrollContainer.getBoundingClientRect().top +
      scrollContainer.scrollTop;
    scrollContainer.scrollTo({
      top: Math.max(0, sectionOffsetTop - 32),
      behavior: 'smooth',
    });
  };

  const handleEditorScroll = (event: UIEvent<HTMLElement>) => {
    const scrollContainer = event.currentTarget;
    const activationLine = scrollContainer.getBoundingClientRect().top + 32;
    const programmaticTarget = programmaticScrollTargetRef.current;

    if (programmaticTarget) {
      const targetSection = document.getElementById(programmaticTarget);
      const targetReached =
        targetSection && Math.abs(targetSection.getBoundingClientRect().top - activationLine) <= 4;
      if (targetReached) {
        programmaticScrollTargetRef.current = null;
        if (programmaticScrollReleaseTimerRef.current) {
          clearTimeout(programmaticScrollReleaseTimerRef.current);
          programmaticScrollReleaseTimerRef.current = null;
        }
      }
      return;
    }

    let nextSection: CourseEditorSectionId = COURSE_EDITOR_SECTION_IDS[0];
    for (const sectionId of COURSE_EDITOR_SECTION_IDS) {
      const section = document.getElementById(sectionId);
      if (!section || section.getBoundingClientRect().top > activationLine) break;
      nextSection = sectionId;
    }
    setActiveSection((current) => (current === nextSection ? current : nextSection));
  };

  return {
    activeSection,
    setEditorScrollElement,
    navigateToSection,
    handleEditorScroll,
  };
}
