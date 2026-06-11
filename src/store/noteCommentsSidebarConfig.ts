export const DEFAULT_COMMENTS_SIDEBAR_WIDTH = 300;
export const MIN_COMMENTS_SIDEBAR_WIDTH = 280;
export const MAX_COMMENTS_SIDEBAR_WIDTH = 560;

const clampWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(width, min), max);

export const getMaxCommentsSidebarWidth = (): number => {
  if (typeof window === 'undefined') return MAX_COMMENTS_SIDEBAR_WIDTH;
  const viewportBasedMax = Math.floor(window.innerWidth * 0.45);
  return Math.max(
    MIN_COMMENTS_SIDEBAR_WIDTH,
    Math.min(MAX_COMMENTS_SIDEBAR_WIDTH, viewportBasedMax)
  );
};

export function normalizeCommentsSidebarWidth(width: number): number {
  return clampWidth(width, MIN_COMMENTS_SIDEBAR_WIDTH, getMaxCommentsSidebarWidth());
}
