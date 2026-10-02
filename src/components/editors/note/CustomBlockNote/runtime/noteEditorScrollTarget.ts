export type NoteScrollTargetResolver = () => HTMLElement | null;

function findScrollableAncestor(
  element: HTMLElement,
  options: { ignoreScrollableWithin?: HTMLElement } = {}
): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const shouldIgnore =
      options.ignoreScrollableWithin &&
      (parent === options.ignoreScrollableWithin ||
        options.ignoreScrollableWithin.contains(parent));
    const { overflowY } = window.getComputedStyle(parent);
    if (
      !shouldIgnore &&
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function scrollNoteEditorTargetIntoView(
  target: HTMLElement,
  options: { block?: ScrollLogicalPosition; ignoreScrollableWithin?: HTMLElement } = {}
): void {
  const behavior = getPreferredScrollBehavior();
  const block = options.block ?? 'center';
  const scrollContainer = findScrollableAncestor(target, options);
  if (!scrollContainer) {
    target.scrollIntoView({ behavior, block, inline: 'nearest' });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = scrollContainer.scrollTop + targetRect.top - containerRect.top;
  if (block === 'nearest') {
    const targetBottom = targetTop + targetRect.height;
    if (targetTop < scrollContainer.scrollTop) {
      scrollContainer.scrollTo({ top: Math.max(0, targetTop), behavior });
    } else if (targetBottom > scrollContainer.scrollTop + scrollContainer.clientHeight) {
      scrollContainer.scrollTo({
        top: Math.max(0, targetBottom - scrollContainer.clientHeight),
        behavior,
      });
    }
    return;
  }

  const scrollTop = Math.max(0, targetTop - (scrollContainer.clientHeight - targetRect.height) / 2);
  scrollContainer.scrollTo({ top: scrollTop, behavior });
}
