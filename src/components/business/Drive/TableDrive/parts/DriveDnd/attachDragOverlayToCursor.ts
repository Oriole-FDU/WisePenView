import type { Modifier, Modifiers } from '@dnd-kit/core';

const DRIVE_DRAG_OVERLAY_CURSOR_OFFSET = { x: 12, y: 12 };

function getDragActivatorCoordinates(event: Event | null): { x: number; y: number } | null {
  if (
    !event ||
    !('clientX' in event) ||
    !('clientY' in event) ||
    typeof event.clientX !== 'number' ||
    typeof event.clientY !== 'number'
  ) {
    return null;
  }

  return { x: event.clientX, y: event.clientY };
}

const attachDragOverlayToCursor: Modifier = ({ activatorEvent, activeNodeRect, transform }) => {
  const activatorCoordinates = getDragActivatorCoordinates(activatorEvent);
  if (!activatorCoordinates || !activeNodeRect) return transform;

  return {
    ...transform,
    x:
      transform.x +
      activatorCoordinates.x -
      activeNodeRect.left +
      DRIVE_DRAG_OVERLAY_CURSOR_OFFSET.x,
    y:
      transform.y +
      activatorCoordinates.y -
      activeNodeRect.top +
      DRIVE_DRAG_OVERLAY_CURSOR_OFFSET.y,
  };
};

export const driveDragOverlayModifiers: Modifiers = [attachDragOverlayToCursor];
