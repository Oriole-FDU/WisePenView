'use client';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import * as React from 'react';

type RenderState = Record<string, unknown>;
type RenderElementProps = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLElement>;
};
type RenderFunction<TState extends RenderState> = (
  props: RenderElementProps,
  state: TState
) => React.ReactElement | null;
type RenderProp<TState extends RenderState> =
  React.ReactElement<Record<string, unknown>> | RenderFunction<TState>;

type MessageScrollerDefaultScrollPosition = 'start' | 'end' | 'last-anchor';
type MessageScrollerButtonDirection = 'start' | 'end';
type MessageScrollerScrollAlign = 'start' | 'center' | 'end' | 'nearest';
type MessageScrollerScrollOptions = {
  align?: MessageScrollerScrollAlign;
  behavior?: ScrollBehavior;
  scrollMargin?: number;
};
type MessageScrollerScrollable = {
  start: boolean;
  end: boolean;
};
type MessageScrollerVisibilityState = {
  currentAnchorId: string | null;
  visibleMessageIds: string[];
};
type MessageScrollerProviderProps = {
  autoScrollResetKey?: string;
  children?: React.ReactNode;
  autoScroll?: boolean;
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition;
  scrollEdgeThreshold?: number;
  scrollPreviousItemPeek?: number;
  scrollMargin?: number;
};
type MessageScrollerProps = React.ComponentPropsWithRef<'div'>;
type MessageScrollerViewportProps = React.ComponentPropsWithRef<'div'> & {
  preserveScrollOnPrepend?: boolean;
};
type MessageScrollerContentProps = React.ComponentPropsWithRef<'div'> & {
  spacerClassName?: string;
};
type MessageScrollerItemProps = React.ComponentPropsWithRef<'div'> & {
  messageId?: string;
  scrollAnchor?: boolean;
};
type MessageScrollerButtonRenderState = {
  active: boolean;
  direction: MessageScrollerButtonDirection;
};
type MessageScrollerButtonProps = React.ComponentPropsWithRef<'button'> & {
  behavior?: ScrollBehavior;
  direction?: MessageScrollerButtonDirection;
  render?: RenderProp<MessageScrollerButtonRenderState>;
};

type ScrollMode = 'following-bottom' | 'free-scrolling' | 'anchored-to-message' | 'settling-jump';
type ScrollableStore = ExternalStore<MessageScrollerScrollable>;
type VisibilityStore = ExternalStore<MessageScrollerVisibilityState>;
type MessageElementRegistry = Map<string, HTMLElement>;
type PrependRestoreState = {
  element: HTMLElement;
  viewportTop: number;
};
type PendingScrollToMessage = {
  messageId: string;
  options?: MessageScrollerScrollOptions;
};
type MessageScrollerContextValue = {
  handleContentChange: () => void;
  handleResize: () => void;
  observeVisibility: () => void;
  preserveScrollOnPrependRef: React.MutableRefObject<boolean>;
  scrollToEnd: (options?: MessageScrollerScrollOptions) => boolean;
  scrollToEndUnlessUserInterrupted: () => boolean;
  scrollToMessage: (messageId: string, options?: MessageScrollerScrollOptions) => boolean;
  scrollToStart: (options?: MessageScrollerScrollOptions) => boolean;
  setContentElement: (element: HTMLDivElement | null) => void;
  setRootElement: (element: HTMLDivElement | null) => void;
  setSpacerElement: (element: HTMLDivElement | null) => void;
  setViewportElement: (element: HTMLDivElement | null) => void;
  stateStore: ScrollableStore;
  syncAfterScroll: () => void;
  unobserveVisibility: () => void;
  userScrollIntent: () => void;
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  visibilityStore: VisibilityStore;
};
type RegisterMessage = (
  messageId: string,
  element: HTMLElement | null,
  previousElement: HTMLElement | null
) => void;
type ExternalStore<TSnapshot> = {
  getSnapshot: () => TSnapshot;
  hasListeners: () => boolean;
  setSnapshot: (nextSnapshot: TSnapshot) => void;
  subscribe: (
    listener: () => void,
    onFirstSubscribe?: () => void,
    onLastUnsubscribe?: () => void
  ) => () => void;
};
type MessageScrollerRefs = {
  autoScrollRef: React.MutableRefObject<boolean>;
  autoscrollingRef: React.MutableRefObject<boolean>;
  autoscrollingTimeoutRef: React.MutableRefObject<number | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  defaultScrollPositionAppliedRef: React.MutableRefObject<boolean>;
  firstItemRef: React.MutableRefObject<HTMLElement | null>;
  handledScrollAnchorsRef: React.MutableRefObject<WeakSet<HTMLElement>>;
  itemCountRef: React.MutableRefObject<number>;
  messageElementsRef: React.MutableRefObject<MessageElementRegistry>;
  modeRef: React.MutableRefObject<ScrollMode>;
  pendingScrollFrameRef: React.MutableRefObject<number | null>;
  pendingFollowScrollFrameRef: React.MutableRefObject<number | null>;
  pendingScrollToMessageRef: React.MutableRefObject<PendingScrollToMessage | null>;
  prependRestoreRef: React.MutableRefObject<PrependRestoreState | null>;
  preserveScrollOnPrependRef: React.MutableRefObject<boolean>;
  rootRef: React.MutableRefObject<HTMLDivElement | null>;
  scrollEdgeThresholdRef: React.MutableRefObject<number>;
  scrollMarginRef: React.MutableRefObject<number>;
  scrollPreviousItemPeekRef: React.MutableRefObject<number>;
  spacerGapRef: React.MutableRefObject<number>;
  spacerHeightRef: React.MutableRefObject<number>;
  spacerRef: React.MutableRefObject<HTMLDivElement | null>;
  stateFrameRef: React.MutableRefObject<number | null>;
  stateStore: ScrollableStore;
  streamingTurnRef: React.MutableRefObject<HTMLElement | null>;
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  visibilityFrameRef: React.MutableRefObject<number | null>;
  visibilityObserverRef: React.MutableRefObject<IntersectionObserver | null>;
  visibilityStore: VisibilityStore;
  visibleMessageIdsRef: React.MutableRefObject<Set<string>>;
};

const DEFAULT_SCROLL_EDGE_THRESHOLD = 8;
const DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK = 64;
const DEFAULT_SCROLL_MARGIN = 0;
const PIXEL_TOLERANCE = 0.5;
const AUTOSCROLLING_RESET_DELAY = 180;
const SCROLL_INTENT_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);
const DEFAULT_SCROLLABLE: MessageScrollerScrollable = {
  start: false,
  end: false,
};
const EMPTY_VISIBLE_MESSAGE_IDS: string[] = [];
const DEFAULT_VISIBILITY: MessageScrollerVisibilityState = {
  currentAnchorId: null,
  visibleMessageIds: EMPTY_VISIBLE_MESSAGE_IDS,
};

function renderComponent<TState extends RenderState>({
  defaultTagName,
  props,
  render,
  state,
  stateAttributesMapping,
}: {
  defaultTagName: 'button';
  props: RenderElementProps;
  render?: RenderProp<TState>;
  state: TState;
  stateAttributesMapping?: Partial<
    Record<keyof TState, (value: TState[keyof TState]) => Record<string, unknown> | undefined>
  >;
}) {
  const mergedProps = mergeProps(mapStateAttributes(state, stateAttributesMapping), props);

  if (!render) {
    return React.createElement(defaultTagName, mergedProps);
  }

  if (typeof render === 'function') {
    return render(mergedProps, state);
  }

  if (!React.isValidElement(render)) {
    return null;
  }

  const renderProps = render.props;
  const clonedProps = mergeProps(mergedProps, renderProps);

  return React.cloneElement(render, clonedProps);
}

function mergeProps(...propsList: Array<Record<string, unknown> | undefined>) {
  const mergedProps: RenderElementProps = {};

  for (const currentProps of propsList) {
    if (!currentProps) {
      continue;
    }

    for (const key of Object.keys(currentProps)) {
      const value = currentProps[key];

      if (value === undefined) {
        continue;
      }

      const existingValue = mergedProps[key];

      if (key === 'className') {
        mergedProps[key] = [existingValue, value].filter(Boolean).join(' ');
        continue;
      }

      if (key === 'style') {
        mergedProps[key] = {
          ...(isObject(existingValue) ? existingValue : undefined),
          ...(isObject(value) ? value : undefined),
        };
        continue;
      }

      if (key === 'ref') {
        mergedProps[key] = composeRefs(
          existingValue as React.Ref<HTMLElement> | undefined,
          value as React.Ref<HTMLElement> | undefined
        );
        continue;
      }

      if (
        isEventHandlerKey(key) &&
        typeof existingValue === 'function' &&
        typeof value === 'function'
      ) {
        mergedProps[key] = composeEventHandlers(
          value as (event: unknown) => void,
          existingValue as (event: unknown) => void
        );
        continue;
      }

      mergedProps[key] = value;
    }
  }

  return mergedProps;
}

function mapStateAttributes<TState extends RenderState>(
  state: TState,
  mapping?: Partial<
    Record<keyof TState, (value: TState[keyof TState]) => Record<string, unknown> | undefined>
  >
) {
  const attributes: Record<string, unknown> = {};

  for (const key of Object.keys(state) as Array<keyof TState>) {
    const value = state[key];
    const mappedAttributes = mapping?.[key]?.(value);

    if (mappedAttributes) {
      Object.assign(attributes, mappedAttributes);
      continue;
    }

    if (key === 'slot') {
      attributes['data-slot'] = value;
      continue;
    }

    const attributeName = `data-${String(key).replace(
      /[A-Z]/g,
      (char) => `-${char.toLowerCase()}`
    )}`;

    if (typeof value === 'boolean') {
      attributes[attributeName] = value ? '' : undefined;
      continue;
    }

    if (value != null) {
      attributes[attributeName] = String(value);
    }
  }

  return attributes;
}

function composeEventHandlers(
  theirHandler: (event: unknown) => void,
  ourHandler: (event: unknown) => void
) {
  return (event: unknown) => {
    theirHandler(event);

    if (!isDefaultPreventedEvent(event) || !event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

function isDefaultPreventedEvent(event: unknown): event is { defaultPrevented: boolean } {
  return (
    typeof event === 'object' &&
    event !== null &&
    'defaultPrevented' in event &&
    typeof event.defaultPrevented === 'boolean'
  );
}

function isEventHandlerKey(key: string) {
  return /^on[A-Z]/.test(key);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function composeRefs<TElement>(
  ...refs: Array<React.Ref<TElement> | undefined>
): React.RefCallback<TElement> | undefined {
  const filteredRefs = refs.filter(Boolean);

  if (filteredRefs.length === 0) {
    return undefined;
  }

  return (element) => {
    for (const ref of filteredRefs) {
      if (typeof ref === 'function') {
        ref(element);
        continue;
      }

      if (ref) {
        ref.current = element;
      }
    }
  };
}

function getScrollableState({
  content,
  scrollEdgeThreshold,
  spacer,
  viewport,
}: {
  content: HTMLElement | null;
  scrollEdgeThreshold: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement | null;
}): MessageScrollerScrollable {
  if (!viewport || !content) {
    return DEFAULT_SCROLLABLE;
  }

  const scrollHeight = getContentScrollHeight({ content, spacer, viewport });

  return {
    start: viewport.scrollTop > scrollEdgeThreshold,
    end: scrollHeight - viewport.scrollTop - viewport.clientHeight > scrollEdgeThreshold,
  };
}

function getVisibilityState({
  content,
  scrollMargin,
  scrollPreviousItemPeek,
  spacer,
  viewport,
  visibleMessageIds,
}: {
  content: HTMLElement | null;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement | null;
  visibleMessageIds: Set<string>;
}): MessageScrollerVisibilityState {
  if (!content || !viewport) {
    return DEFAULT_VISIBILITY;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const anchorTopEdge = viewportRect.top + scrollMargin + scrollPreviousItemPeek;
  const needsManualIntersection = typeof IntersectionObserver === 'undefined';
  const nextVisibleMessageIds: string[] = [];
  let currentAnchorId: string | null = null;

  for (const item of getMessageItems(content, spacer)) {
    const messageId = item.dataset.messageId;

    if (!messageId) {
      continue;
    }

    const isScrollAnchor = item.dataset.scrollAnchor === 'true';
    const itemRect =
      isScrollAnchor || needsManualIntersection ? item.getBoundingClientRect() : null;

    if (
      needsManualIntersection && itemRect
        ? itemRect.bottom > anchorTopEdge && itemRect.top < viewportRect.bottom
        : visibleMessageIds.has(messageId)
    ) {
      nextVisibleMessageIds.push(messageId);
    }

    if (isScrollAnchor && itemRect && itemRect.top <= anchorTopEdge + PIXEL_TOLERANCE) {
      currentAnchorId = messageId;
    }
  }

  if (nextVisibleMessageIds.length === 0 && currentAnchorId === null) {
    return DEFAULT_VISIBILITY;
  }

  return {
    currentAnchorId,
    visibleMessageIds: nextVisibleMessageIds,
  };
}

function getMessageItems(content: HTMLElement, spacer: HTMLElement | null) {
  // 消息项可能嵌套在 Content 子容器内（如 messagesBody），不能只用 children
  return Array.from(content.querySelectorAll<HTMLElement>('[data-message-id]')).filter(
    (item) => item !== spacer && Boolean(item.dataset.messageId)
  );
}

function findFirstScrollAnchorFromIndex(items: HTMLElement[], startIndex: number) {
  for (let index = startIndex; index < items.length; index += 1) {
    const item = items[index];

    if (item?.dataset.scrollAnchor === 'true') {
      return item;
    }
  }

  return null;
}

function findUnhandledScrollAnchor(
  items: HTMLElement[],
  handledScrollAnchors: WeakSet<HTMLElement>
) {
  for (const item of items) {
    if (item.dataset.scrollAnchor === 'true' && !handledScrollAnchors.has(item)) {
      return item;
    }
  }

  return null;
}

function hasMoreThanOneScrollAnchorFromIndex(items: HTMLElement[], startIndex: number) {
  let anchorCount = 0;

  for (let index = startIndex; index < items.length; index += 1) {
    if (items[index]?.dataset.scrollAnchor === 'true') {
      anchorCount += 1;

      if (anchorCount > 1) {
        return true;
      }
    }
  }

  return false;
}

function findLastScrollAnchor(items: HTMLElement[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (item?.dataset.scrollAnchor === 'true') {
      return item;
    }
  }

  return null;
}

function findFirstVisibleMessage({
  content,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const viewportRect = viewport.getBoundingClientRect();

  for (const item of getMessageItems(content, spacer)) {
    if (!item.dataset.messageId) {
      continue;
    }

    const itemRect = item.getBoundingClientRect();

    if (itemRect.bottom > viewportRect.top && itemRect.top < viewportRect.bottom) {
      return item;
    }
  }

  return null;
}

function getElementScrollTop({
  align,
  element,
  scrollMargin,
  spacer,
  viewport,
}: {
  align: MessageScrollerScrollAlign;
  element: HTMLElement;
  scrollMargin: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const elementTop = getElementOffsetTop(element, viewport);
  const elementHeight = element.getBoundingClientRect().height;
  const spacerPadding = getSpacerPadding(spacer);

  if (align === 'center') {
    const availableHeight = Math.max(
      0,
      viewport.clientHeight - spacerPadding.start - spacerPadding.end
    );

    return elementTop - spacerPadding.start - (availableHeight - elementHeight) / 2 - scrollMargin;
  }

  if (align === 'end') {
    return elementTop - viewport.clientHeight + elementHeight + spacerPadding.end + scrollMargin;
  }

  if (align === 'nearest') {
    const elementBottom = elementTop + elementHeight;
    const viewportStart = viewport.scrollTop + spacerPadding.start;
    const viewportEnd = viewport.scrollTop + viewport.clientHeight - spacerPadding.end;

    if (elementTop >= viewportStart && elementBottom <= viewportEnd) {
      return viewport.scrollTop;
    }

    if (elementTop < viewportStart) {
      return elementTop - spacerPadding.start - scrollMargin;
    }

    return elementBottom - viewport.clientHeight + spacerPadding.end + scrollMargin;
  }

  return elementTop - spacerPadding.start - scrollMargin;
}

function getElementOffsetTop(element: HTMLElement, viewport: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();

  return elementRect.top - viewportRect.top + viewport.scrollTop;
}

function getElementViewportTop(element: HTMLElement, viewport: HTMLElement) {
  return element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
}

function getDistanceFromEnd({
  content,
  scrollTop,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  scrollTop: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const scrollHeight = getContentScrollHeight({ content, spacer, viewport });

  return scrollTop + viewport.clientHeight - scrollHeight;
}

function getContentScrollHeight({
  content,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const items = getMessageItems(content, spacer);
  const contentPadding = getBlockPadding(content);
  const viewportRect = viewport.getBoundingClientRect();
  const scrollTop = viewport.scrollTop;
  let scrollHeight = contentPadding.start + contentPadding.end;

  for (const item of items) {
    const itemRect = item.getBoundingClientRect();
    scrollHeight = Math.max(
      scrollHeight,
      itemRect.bottom - viewportRect.top + scrollTop + contentPadding.end
    );
  }

  return scrollHeight;
}

function getMaxScrollTop(element: HTMLElement) {
  return Math.max(0, element.scrollHeight - element.clientHeight);
}

function getBlockPadding(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return {
    end: parseCssNumber(style.paddingBlockEnd || style.paddingBottom),
    start: parseCssNumber(style.paddingBlockStart || style.paddingTop),
  };
}

function getSpacerPadding(spacer: HTMLElement | null) {
  const parent = spacer?.parentElement;

  return parent ? getBlockPadding(parent) : { end: 0, start: 0 };
}

function getRowGap(element: HTMLElement | null) {
  if (!element) {
    return 0;
  }

  const style = window.getComputedStyle(element);
  const gap = style.rowGap === 'normal' ? style.gap : style.rowGap;

  return parseCssNumber(gap);
}

function parseCssNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const number = Number.parseFloat(value);

  return Number.isFinite(number) ? number : 0;
}

function useScrollCommands({
  commitScrollState,
  refs,
  scheduleStateCommit,
  scheduleVisibilitySync,
}: {
  refs: MessageScrollerRefs;
  commitScrollState: () => void;
  scheduleStateCommit: () => void;
  scheduleVisibilitySync: () => void;
}) {
  const {
    autoScrollRef,
    autoscrollingRef,
    autoscrollingTimeoutRef,
    contentRef,
    defaultScrollPositionAppliedRef,
    itemCountRef,
    messageElementsRef,
    modeRef,
    pendingScrollToMessageRef,
    prependRestoreRef,
    scrollMarginRef,
    scrollPreviousItemPeekRef,
    spacerGapRef,
    spacerHeightRef,
    spacerRef,
    streamingTurnRef,
    viewportRef,
  } = refs;
  const setAutoscrolling = React.useCallback(
    (isAutoscrolling: boolean) => {
      if (autoscrollingTimeoutRef.current !== null) {
        window.clearTimeout(autoscrollingTimeoutRef.current);
        autoscrollingTimeoutRef.current = null;
      }

      if (autoscrollingRef.current !== isAutoscrolling) {
        autoscrollingRef.current = isAutoscrolling;
        commitScrollState();
      }

      if (isAutoscrolling) {
        autoscrollingTimeoutRef.current = window.setTimeout(() => {
          autoscrollingTimeoutRef.current = null;
          autoscrollingRef.current = false;
          commitScrollState();
        }, AUTOSCROLLING_RESET_DELAY);
      }
    },
    [autoscrollingRef, autoscrollingTimeoutRef, commitScrollState]
  );
  const setSpacerHeight = React.useCallback(
    (height: number) => {
      const spacer = spacerRef.current;

      if (!spacer) {
        return;
      }

      const nextHeight = Math.max(0, Math.ceil(height));

      if (spacerHeightRef.current === nextHeight) {
        return;
      }

      spacerHeightRef.current = nextHeight;
      spacer.hidden = nextHeight === 0;
      spacer.style.height = `${nextHeight}px`;
      spacer.style.marginTop = nextHeight > 0 ? `${-spacerGapRef.current}px` : '';
    },
    [spacerGapRef, spacerHeightRef, spacerRef]
  );
  const scrollToTop = React.useCallback(
    (
      scrollTop: number,
      {
        behavior = 'auto',
        autoscrolling = false,
      }: { behavior?: ScrollBehavior; autoscrolling?: boolean } = {}
    ) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const nextScrollTop = Math.max(0, scrollTop);

      if (Math.abs(viewport.scrollTop - nextScrollTop) <= PIXEL_TOLERANCE) {
        viewport.scrollTop = nextScrollTop;
        commitScrollState();
        return;
      }

      if (autoscrolling) {
        setAutoscrolling(true);
      }

      viewport.scrollTo({ top: nextScrollTop, behavior });
      scheduleStateCommit();
    },
    [commitScrollState, scheduleStateCommit, setAutoscrolling, viewportRef]
  );
  const scrollToStart = React.useCallback(
    ({ behavior = 'auto' }: MessageScrollerScrollOptions = {}) => {
      if (!viewportRef.current) {
        return false;
      }

      setSpacerHeight(0);
      streamingTurnRef.current = null;
      modeRef.current = 'free-scrolling';
      scrollToTop(0, { behavior });
      scheduleVisibilitySync();

      return true;
    },
    [modeRef, scheduleVisibilitySync, scrollToTop, setSpacerHeight, streamingTurnRef, viewportRef]
  );
  const scrollToEnd = React.useCallback(
    ({ behavior = 'auto' }: MessageScrollerScrollOptions = {}) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return false;
      }

      setSpacerHeight(0);
      streamingTurnRef.current = null;
      modeRef.current = autoScrollRef.current ? 'following-bottom' : 'free-scrolling';
      scrollToTop(getMaxScrollTop(viewport), {
        autoscrolling: true,
        behavior,
      });
      scheduleVisibilitySync();

      return true;
    },
    [
      autoScrollRef,
      modeRef,
      scheduleVisibilitySync,
      scrollToTop,
      setSpacerHeight,
      streamingTurnRef,
      viewportRef,
    ]
  );
  const scrollToElement = React.useCallback(
    (
      element: HTMLElement,
      {
        align = 'start',
        behavior = 'auto',
        scrollMargin = scrollMarginRef.current,
      }: MessageScrollerScrollOptions = {},
      { keepPreviousPeek = false }: { keepPreviousPeek?: boolean } = {}
    ) => {
      const content = contentRef.current;
      const viewport = viewportRef.current;

      if (!content || !viewport || !content.contains(element)) {
        return false;
      }

      const scrollTop = getElementScrollTop({
        align,
        element,
        scrollMargin: keepPreviousPeek
          ? scrollMargin + scrollPreviousItemPeekRef.current
          : scrollMargin,
        spacer: spacerRef.current,
        viewport,
      });
      const distanceFromEnd = getDistanceFromEnd({
        content,
        scrollTop,
        spacer: spacerRef.current,
        viewport,
      });

      setSpacerHeight(distanceFromEnd);
      prependRestoreRef.current = {
        element,
        viewportTop: getElementViewportTop(element, viewport),
      };
      modeRef.current = keepPreviousPeek ? 'anchored-to-message' : 'settling-jump';
      streamingTurnRef.current = keepPreviousPeek ? element : null;
      scrollToTop(scrollTop, { behavior });
      scheduleVisibilitySync();

      return true;
    },
    [
      contentRef,
      modeRef,
      prependRestoreRef,
      scheduleVisibilitySync,
      scrollMarginRef,
      scrollPreviousItemPeekRef,
      scrollToTop,
      setSpacerHeight,
      spacerRef,
      streamingTurnRef,
      viewportRef,
    ]
  );
  const reanchorToAnchoredMessage = React.useCallback(() => {
    const element = streamingTurnRef.current;

    if (!element || !element.isConnected || modeRef.current !== 'anchored-to-message') {
      return false;
    }

    return scrollToElement(element, { align: 'start' }, { keepPreviousPeek: true });
  }, [modeRef, scrollToElement, streamingTurnRef]);
  const scrollToMessage = React.useCallback(
    (messageId: string, options?: MessageScrollerScrollOptions) => {
      const element = messageElementsRef.current.get(messageId);

      if (element) {
        defaultScrollPositionAppliedRef.current = true;

        if (scrollToElement(element, options)) {
          pendingScrollToMessageRef.current = null;
          return true;
        }

        pendingScrollToMessageRef.current = { messageId, options };
        return true;
      }

      if (itemCountRef.current === 0) {
        pendingScrollToMessageRef.current = { messageId, options };
        defaultScrollPositionAppliedRef.current = true;
        return true;
      }

      return false;
    },
    [
      defaultScrollPositionAppliedRef,
      itemCountRef,
      messageElementsRef,
      pendingScrollToMessageRef,
      scrollToElement,
    ]
  );

  return {
    flushPendingScrollToMessage: React.useCallback(() => {
      const pendingScroll = pendingScrollToMessageRef.current;

      if (!pendingScroll) {
        return false;
      }

      const element = messageElementsRef.current.get(pendingScroll.messageId);

      if (!element || !scrollToElement(element, pendingScroll.options)) {
        return false;
      }

      pendingScrollToMessageRef.current = null;
      defaultScrollPositionAppliedRef.current = true;

      return true;
    }, [
      defaultScrollPositionAppliedRef,
      messageElementsRef,
      pendingScrollToMessageRef,
      scrollToElement,
    ]),
    reanchorToAnchoredMessage,
    scrollToElement,
    scrollToEnd,
    scrollToMessage,
    scrollToStart,
  };
}

function createExternalStore<TSnapshot>(
  initialSnapshot: TSnapshot,
  areEqual: (current: TSnapshot, next: TSnapshot) => boolean
): ExternalStore<TSnapshot> {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    hasListeners: () => listeners.size > 0,
    setSnapshot: (nextSnapshot) => {
      if (areEqual(snapshot, nextSnapshot)) {
        return;
      }

      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener, onFirstSubscribe, onLastUnsubscribe) => {
      const isFirstListener = listeners.size === 0;
      listeners.add(listener);

      if (isFirstListener) {
        onFirstSubscribe?.();
      }

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          onLastUnsubscribe?.();
        }
      };
    },
  };
}

function createScrollableStore() {
  return createExternalStore(DEFAULT_SCROLLABLE, areScrollableStatesEqual);
}

function createVisibilityStore() {
  return createExternalStore(DEFAULT_VISIBILITY, areVisibilityStatesEqual);
}

function areScrollableStatesEqual(
  current: MessageScrollerScrollable,
  next: MessageScrollerScrollable
) {
  return current.start === next.start && current.end === next.end;
}

function areVisibilityStatesEqual(
  current: MessageScrollerVisibilityState,
  next: MessageScrollerVisibilityState
) {
  if (
    current.currentAnchorId !== next.currentAnchorId ||
    current.visibleMessageIds.length !== next.visibleMessageIds.length
  ) {
    return false;
  }

  return current.visibleMessageIds.every(
    (messageId, index) => messageId === next.visibleMessageIds[index]
  );
}

function useMessageScrollerRefs({
  autoScroll,
  scrollEdgeThreshold,
  scrollMargin,
  scrollPreviousItemPeek,
}: {
  autoScroll: boolean;
  scrollEdgeThreshold: number;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
}): MessageScrollerRefs {
  const autoScrollRef = React.useRef(autoScroll);
  const autoscrollingRef = React.useRef(false);
  const autoscrollingTimeoutRef = React.useRef<number | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const defaultScrollPositionAppliedRef = React.useRef(false);
  const firstItemRef = React.useRef<HTMLElement | null>(null);
  const handledScrollAnchorsRef = React.useRef(new WeakSet<HTMLElement>());
  const itemCountRef = React.useRef(0);
  const messageElementsRef = React.useRef<MessageElementRegistry>(new Map());
  const modeRef = React.useRef<ScrollMode>(autoScroll ? 'following-bottom' : 'free-scrolling');
  const pendingScrollFrameRef = React.useRef<number | null>(null);
  const pendingFollowScrollFrameRef = React.useRef<number | null>(null);
  const pendingScrollToMessageRef = React.useRef<PendingScrollToMessage | null>(null);
  const prependRestoreRef = React.useRef<PrependRestoreState | null>(null);
  const preserveScrollOnPrependRef = React.useRef(true);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const scrollEdgeThresholdRef = React.useRef(scrollEdgeThreshold);
  const scrollMarginRef = React.useRef(scrollMargin);
  const scrollPreviousItemPeekRef = React.useRef(scrollPreviousItemPeek);
  const spacerGapRef = React.useRef(0);
  const spacerHeightRef = React.useRef(0);
  const spacerRef = React.useRef<HTMLDivElement | null>(null);
  const stateFrameRef = React.useRef<number | null>(null);
  const stateStoreRef = React.useRef<ScrollableStore | null>(null);
  const streamingTurnRef = React.useRef<HTMLElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const visibilityFrameRef = React.useRef<number | null>(null);
  const visibilityObserverRef = React.useRef<IntersectionObserver | null>(null);
  const visibilityStoreRef = React.useRef<VisibilityStore | null>(null);
  const visibleMessageIdsRef = React.useRef(new Set<string>());

  if (stateStoreRef.current === null) {
    stateStoreRef.current = createScrollableStore();
  }

  if (visibilityStoreRef.current === null) {
    visibilityStoreRef.current = createVisibilityStore();
  }

  autoScrollRef.current = autoScroll;
  scrollEdgeThresholdRef.current = scrollEdgeThreshold;
  scrollMarginRef.current = scrollMargin;
  scrollPreviousItemPeekRef.current = scrollPreviousItemPeek;

  return {
    autoScrollRef,
    autoscrollingRef,
    autoscrollingTimeoutRef,
    contentRef,
    defaultScrollPositionAppliedRef,
    firstItemRef,
    handledScrollAnchorsRef,
    itemCountRef,
    messageElementsRef,
    modeRef,
    pendingScrollFrameRef,
    pendingFollowScrollFrameRef,
    pendingScrollToMessageRef,
    prependRestoreRef,
    preserveScrollOnPrependRef,
    rootRef,
    scrollEdgeThresholdRef,
    scrollMarginRef,
    scrollPreviousItemPeekRef,
    spacerGapRef,
    spacerHeightRef,
    spacerRef,
    stateFrameRef,
    stateStore: stateStoreRef.current,
    streamingTurnRef,
    viewportRef,
    visibilityFrameRef,
    visibilityObserverRef,
    visibilityStore: visibilityStoreRef.current,
    visibleMessageIdsRef,
  };
}

function useElementRef<TElement extends HTMLElement>(
  ref: React.MutableRefObject<TElement | null>,
  onRefChange: () => void
) {
  return React.useCallback(
    (element: TElement | null) => {
      ref.current = element;

      if (element) {
        onRefChange();
      }
    },
    [onRefChange, ref]
  );
}

function useMessageScrollerController({
  autoScroll = false,
  autoScrollResetKey,
  defaultScrollPosition = 'end',
  scrollEdgeThreshold = DEFAULT_SCROLL_EDGE_THRESHOLD,
  scrollPreviousItemPeek = DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK,
  scrollMargin = DEFAULT_SCROLL_MARGIN,
}: Required<Pick<MessageScrollerProviderProps, 'autoScroll'>> &
  Omit<MessageScrollerProviderProps, 'autoScroll' | 'children'>) {
  const refs = useMessageScrollerRefs({
    autoScroll,
    scrollEdgeThreshold,
    scrollMargin,
    scrollPreviousItemPeek,
  });
  const {
    autoScrollRef,
    autoscrollingRef,
    autoscrollingTimeoutRef,
    contentRef,
    defaultScrollPositionAppliedRef,
    firstItemRef,
    handledScrollAnchorsRef,
    itemCountRef,
    messageElementsRef,
    modeRef,
    pendingScrollFrameRef,
    pendingFollowScrollFrameRef,
    pendingScrollToMessageRef,
    prependRestoreRef,
    preserveScrollOnPrependRef,
    rootRef,
    scrollEdgeThresholdRef,
    scrollMarginRef,
    scrollPreviousItemPeekRef,
    spacerGapRef,
    spacerRef,
    stateFrameRef,
    stateStore,
    streamingTurnRef,
    viewportRef,
    visibilityFrameRef,
    visibilityObserverRef,
    visibilityStore,
    visibleMessageIdsRef,
  } = refs;
  const defaultScrollPositionRef =
    React.useRef<MessageScrollerDefaultScrollPosition>(defaultScrollPosition);
  const autoScrollResetKeyRef = React.useRef(autoScrollResetKey);

  if (defaultScrollPositionRef.current !== defaultScrollPosition) {
    defaultScrollPositionRef.current = defaultScrollPosition;
    defaultScrollPositionAppliedRef.current = false;
  }

  if (autoScrollResetKeyRef.current !== autoScrollResetKey) {
    autoScrollResetKeyRef.current = autoScrollResetKey;
    modeRef.current = autoScroll ? 'following-bottom' : 'free-scrolling';
  }

  const syncScrollAttributes = React.useCallback(
    (scrollableState: MessageScrollerScrollable) => {
      const root = rootRef.current;
      const viewport = viewportRef.current;
      const scrollableValue = [scrollableState.start && 'start', scrollableState.end && 'end']
        .filter(Boolean)
        .join(' ');
      const isAutoscrolling = autoscrollingRef.current;

      for (const element of [root, viewport]) {
        if (!element) {
          continue;
        }

        if (scrollableValue) {
          element.setAttribute('data-scrollable', scrollableValue);
        } else {
          element.removeAttribute('data-scrollable');
        }

        element.toggleAttribute('data-autoscrolling', isAutoscrolling);
      }
    },
    [autoscrollingRef, rootRef, viewportRef]
  );
  const updateScrollModeFromState = React.useCallback(
    (scrollableState: MessageScrollerScrollable) => {
      if (autoScrollRef.current && !scrollableState.end && modeRef.current !== 'settling-jump') {
        modeRef.current = 'following-bottom';
        return;
      }

      if (
        modeRef.current === 'following-bottom' &&
        scrollableState.end &&
        !autoscrollingRef.current
      ) {
        modeRef.current = 'free-scrolling';
      }
    },
    [autoScrollRef, autoscrollingRef, modeRef]
  );
  const commitScrollState = React.useCallback(() => {
    const scrollableState = getScrollableState({
      content: contentRef.current,
      scrollEdgeThreshold: scrollEdgeThresholdRef.current,
      spacer: spacerRef.current,
      viewport: viewportRef.current,
    });

    updateScrollModeFromState(scrollableState);
    syncScrollAttributes(scrollableState);
    stateStore.setSnapshot(scrollableState);
  }, [
    contentRef,
    scrollEdgeThresholdRef,
    spacerRef,
    stateStore,
    syncScrollAttributes,
    updateScrollModeFromState,
    viewportRef,
  ]);
  const scheduleStateCommit = React.useCallback(() => {
    if (stateFrameRef.current !== null) {
      return;
    }

    stateFrameRef.current = window.requestAnimationFrame(() => {
      stateFrameRef.current = null;
      commitScrollState();
    });
  }, [commitScrollState, stateFrameRef]);
  const scheduleVisibilitySync = React.useCallback(() => {
    if (!visibilityStore.hasListeners() || visibilityFrameRef.current !== null) {
      return;
    }

    visibilityFrameRef.current = window.requestAnimationFrame(() => {
      visibilityFrameRef.current = null;

      if (visibilityStore.hasListeners()) {
        visibilityStore.setSnapshot(
          getVisibilityState({
            content: contentRef.current,
            scrollMargin: scrollMarginRef.current,
            scrollPreviousItemPeek: scrollPreviousItemPeekRef.current,
            spacer: spacerRef.current,
            viewport: viewportRef.current,
            visibleMessageIds: visibleMessageIdsRef.current,
          })
        );
      }
    });
  }, [
    contentRef,
    scrollMarginRef,
    scrollPreviousItemPeekRef,
    spacerRef,
    viewportRef,
    visibilityFrameRef,
    visibilityStore,
    visibleMessageIdsRef,
  ]);
  const {
    flushPendingScrollToMessage,
    reanchorToAnchoredMessage,
    scrollToElement,
    scrollToEnd,
    scrollToMessage,
    scrollToStart,
  } = useScrollCommands({
    refs,
    commitScrollState,
    scheduleStateCommit,
    scheduleVisibilitySync,
  });
  const scrollToEndUnlessUserInterrupted = React.useCallback(() => {
    if (!autoScrollRef.current || modeRef.current === 'free-scrolling') return false;
    if (pendingFollowScrollFrameRef.current !== null) return true;

    pendingFollowScrollFrameRef.current = window.requestAnimationFrame(() => {
      pendingFollowScrollFrameRef.current = null;
      if (autoScrollRef.current && modeRef.current !== 'free-scrolling') {
        scrollToEnd({ behavior: 'auto' });
      }
    });

    return true;
  }, [autoScrollRef, modeRef, pendingFollowScrollFrameRef, scrollToEnd]);
  const preservePrependScroll = React.useCallback(() => {
    const restoreState = prependRestoreRef.current;
    const viewport = viewportRef.current;

    if (!restoreState || !viewport || !restoreState.element.isConnected) {
      return false;
    }

    const delta = getElementViewportTop(restoreState.element, viewport) - restoreState.viewportTop;

    if (Math.abs(delta) <= PIXEL_TOLERANCE) {
      return false;
    }

    viewport.scrollTop += delta;
    restoreState.viewportTop = getElementViewportTop(restoreState.element, viewport);
    scheduleStateCommit();
    scheduleVisibilitySync();

    return true;
  }, [prependRestoreRef, scheduleStateCommit, scheduleVisibilitySync, viewportRef]);
  const capturePrependAnchor = React.useCallback(() => {
    const content = contentRef.current;
    const viewport = viewportRef.current;

    if (!content || !viewport) {
      prependRestoreRef.current = null;
      return;
    }

    const visibleMessage = findFirstVisibleMessage({
      content,
      spacer: spacerRef.current,
      viewport,
    });

    prependRestoreRef.current = visibleMessage
      ? {
          element: visibleMessage,
          viewportTop: getElementViewportTop(visibleMessage, viewport),
        }
      : null;
  }, [contentRef, prependRestoreRef, spacerRef, viewportRef]);
  const schedulePendingScrollFlush = React.useCallback(() => {
    if (pendingScrollFrameRef.current !== null) {
      return;
    }

    pendingScrollFrameRef.current = window.requestAnimationFrame(() => {
      pendingScrollFrameRef.current = null;

      if (flushPendingScrollToMessage()) {
        capturePrependAnchor();
      }
    });
  }, [capturePrependAnchor, flushPendingScrollToMessage, pendingScrollFrameRef]);
  const applyDefaultScrollPosition = React.useCallback(() => {
    if (
      !defaultScrollPosition ||
      defaultScrollPositionAppliedRef.current ||
      itemCountRef.current === 0
    ) {
      return false;
    }

    let didScroll = false;

    if (defaultScrollPosition === 'last-anchor') {
      const content = contentRef.current;
      const viewport = viewportRef.current;
      const lastAnchor =
        content && viewport
          ? findLastScrollAnchor(getMessageItems(content, spacerRef.current))
          : null;

      if (!content || !viewport || !lastAnchor) {
        didScroll = scrollToEnd({ behavior: 'auto' });
      } else {
        const anchorTop = getElementOffsetTop(lastAnchor, viewport);
        didScroll =
          getContentScrollHeight({
            content,
            spacer: spacerRef.current,
            viewport,
          }) -
            anchorTop <=
          viewport.clientHeight
            ? scrollToEnd({ behavior: 'auto' })
            : scrollToElement(lastAnchor, { align: 'start' }, { keepPreviousPeek: true });
      }
    } else {
      didScroll =
        defaultScrollPosition === 'end'
          ? scrollToEnd({ behavior: 'auto' })
          : scrollToStart({ behavior: 'auto' });
    }

    if (didScroll) {
      defaultScrollPositionAppliedRef.current = true;
      return true;
    }

    return false;
  }, [
    contentRef,
    defaultScrollPosition,
    defaultScrollPositionAppliedRef,
    itemCountRef,
    scrollToElement,
    scrollToEnd,
    scrollToStart,
    spacerRef,
    viewportRef,
  ]);
  const handleContentChange = React.useCallback(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const items = getMessageItems(content, spacerRef.current);
    const previousItemCount = itemCountRef.current;
    const previousFirstItem = firstItemRef.current;

    itemCountRef.current = items.length;
    firstItemRef.current = items[0] ?? null;

    if (flushPendingScrollToMessage()) {
      capturePrependAnchor();
      return;
    }

    if (previousItemCount === 0) {
      if (
        applyDefaultScrollPosition() ||
        (items.length > 0 && autoScrollRef.current && scrollToEnd({ behavior: 'auto' }))
      ) {
        capturePrependAnchor();
        return;
      }

      commitScrollState();
      scheduleVisibilitySync();
      capturePrependAnchor();
      return;
    }

    const previousFirstIndex = previousFirstItem ? items.indexOf(previousFirstItem) : -1;

    if (preserveScrollOnPrependRef.current && previousFirstIndex > 0) {
      preservePrependScroll();
      capturePrependAnchor();
      return;
    }

    if (items.length > previousItemCount) {
      const newScrollAnchor = findFirstScrollAnchorFromIndex(items, previousItemCount);

      if (newScrollAnchor) {
        if (
          autoScrollRef.current &&
          modeRef.current === 'following-bottom' &&
          hasMoreThanOneScrollAnchorFromIndex(items, previousItemCount)
        ) {
          scrollToEnd({ behavior: 'auto' });
          capturePrependAnchor();
          return;
        }

        scrollToElement(newScrollAnchor, { align: 'start' }, { keepPreviousPeek: true });
        handledScrollAnchorsRef.current.add(newScrollAnchor);
        capturePrependAnchor();
        return;
      }
    }

    if (items.length === previousItemCount) {
      const unhandledAnchor = findUnhandledScrollAnchor(items, handledScrollAnchorsRef.current);

      if (unhandledAnchor) {
        scrollToElement(unhandledAnchor, { align: 'start' }, { keepPreviousPeek: true });
        handledScrollAnchorsRef.current.add(unhandledAnchor);
        capturePrependAnchor();
        return;
      }
    }

    if (modeRef.current === 'following-bottom' && autoScrollRef.current) {
      scrollToEnd({ behavior: 'auto' });
      capturePrependAnchor();
      return;
    }

    commitScrollState();
    scheduleVisibilitySync();
    capturePrependAnchor();
  }, [
    applyDefaultScrollPosition,
    autoScrollRef,
    capturePrependAnchor,
    commitScrollState,
    contentRef,
    firstItemRef,
    flushPendingScrollToMessage,
    handledScrollAnchorsRef,
    itemCountRef,
    modeRef,
    preservePrependScroll,
    preserveScrollOnPrependRef,
    scheduleVisibilitySync,
    scrollToElement,
    scrollToEnd,
    spacerRef,
  ]);
  const handleResize = React.useCallback(() => {
    if (modeRef.current === 'following-bottom' && autoScrollRef.current) {
      scrollToEnd({ behavior: 'auto' });
      return;
    }

    if (!reanchorToAnchoredMessage()) {
      scheduleStateCommit();
      scheduleVisibilitySync();
    }
  }, [
    autoScrollRef,
    modeRef,
    reanchorToAnchoredMessage,
    scheduleStateCommit,
    scheduleVisibilitySync,
    scrollToEnd,
  ]);
  const observeVisibility = React.useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || !visibilityStore.hasListeners()) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      scheduleVisibilitySync();
      return;
    }

    if (!visibilityObserverRef.current) {
      visibilityObserverRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const messageId = (entry.target as HTMLElement).dataset.messageId;

            if (!messageId) {
              continue;
            }

            if (entry.isIntersecting) {
              visibleMessageIdsRef.current.add(messageId);
            } else {
              visibleMessageIdsRef.current.delete(messageId);
            }
          }

          scheduleVisibilitySync();
        },
        {
          root: viewport,
          rootMargin: `${-(scrollMarginRef.current + scrollPreviousItemPeekRef.current)}px 0px 0px 0px`,
          threshold: [0, 0.01, 0.5, 1],
        }
      );
    }

    messageElementsRef.current.forEach((element) => {
      visibilityObserverRef.current?.observe(element);
    });
    scheduleVisibilitySync();
  }, [
    messageElementsRef,
    scheduleVisibilitySync,
    scrollMarginRef,
    scrollPreviousItemPeekRef,
    viewportRef,
    visibilityObserverRef,
    visibilityStore,
    visibleMessageIdsRef,
  ]);
  const unobserveVisibility = React.useCallback(() => {
    if (visibilityFrameRef.current !== null) {
      window.cancelAnimationFrame(visibilityFrameRef.current);
      visibilityFrameRef.current = null;
    }

    visibilityObserverRef.current?.disconnect();
    visibilityObserverRef.current = null;
    visibleMessageIdsRef.current.clear();
    visibilityStore.setSnapshot(DEFAULT_VISIBILITY);
  }, [visibilityFrameRef, visibilityObserverRef, visibilityStore, visibleMessageIdsRef]);
  const registerMessage = React.useCallback<RegisterMessage>(
    (messageId, element, previousElement) => {
      if (element) {
        messageElementsRef.current.set(messageId, element);
        visibilityObserverRef.current?.observe(element);
        scheduleVisibilitySync();

        if (pendingScrollToMessageRef.current?.messageId === messageId) {
          schedulePendingScrollFlush();
        }

        return;
      }

      if (previousElement && messageElementsRef.current.get(messageId) === previousElement) {
        messageElementsRef.current.delete(messageId);
        visibleMessageIdsRef.current.delete(messageId);
        visibilityObserverRef.current?.unobserve(previousElement);
        scheduleVisibilitySync();
      }
    },
    [
      messageElementsRef,
      pendingScrollToMessageRef,
      schedulePendingScrollFlush,
      scheduleVisibilitySync,
      visibilityObserverRef,
      visibleMessageIdsRef,
    ]
  );
  const userScrollIntent = React.useCallback(() => {
    if (
      modeRef.current === 'following-bottom' ||
      modeRef.current === 'anchored-to-message' ||
      modeRef.current === 'settling-jump'
    ) {
      streamingTurnRef.current = null;
      modeRef.current = 'free-scrolling';
    }
  }, [modeRef, streamingTurnRef]);
  const syncCurrentAttributes = React.useCallback(() => {
    syncScrollAttributes(stateStore.getSnapshot());
  }, [stateStore, syncScrollAttributes]);
  const setRootElement = useElementRef(rootRef, syncCurrentAttributes);
  const setViewportElement = useElementRef(viewportRef, syncCurrentAttributes);
  const setContentElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
    },
    [contentRef]
  );
  const setSpacerElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      spacerRef.current = element;
      spacerGapRef.current = getRowGap(element?.parentElement ?? null);
    },
    [spacerGapRef, spacerRef]
  );
  const syncAfterScroll = React.useCallback(() => {
    commitScrollState();
    scheduleVisibilitySync();
    capturePrependAnchor();
  }, [capturePrependAnchor, commitScrollState, scheduleVisibilitySync]);
  const context = React.useMemo<MessageScrollerContextValue>(
    () => ({
      handleContentChange,
      handleResize,
      observeVisibility,
      preserveScrollOnPrependRef,
      scrollToEnd,
      scrollToEndUnlessUserInterrupted,
      scrollToMessage,
      scrollToStart,
      setContentElement,
      setRootElement,
      setSpacerElement,
      setViewportElement,
      stateStore,
      syncAfterScroll,
      unobserveVisibility,
      userScrollIntent,
      viewportRef,
      visibilityStore,
    }),
    [
      handleContentChange,
      handleResize,
      observeVisibility,
      preserveScrollOnPrependRef,
      scrollToEnd,
      scrollToEndUnlessUserInterrupted,
      scrollToMessage,
      scrollToStart,
      setContentElement,
      setRootElement,
      setSpacerElement,
      setViewportElement,
      stateStore,
      syncAfterScroll,
      unobserveVisibility,
      userScrollIntent,
      viewportRef,
      visibilityStore,
    ]
  );

  React.useLayoutEffect(() => {
    applyDefaultScrollPosition();
  }, [applyDefaultScrollPosition]);

  React.useEffect(
    () => () => {
      if (stateFrameRef.current !== null) {
        window.cancelAnimationFrame(stateFrameRef.current);
        stateFrameRef.current = null;
      }

      if (visibilityFrameRef.current !== null) {
        window.cancelAnimationFrame(visibilityFrameRef.current);
        visibilityFrameRef.current = null;
      }

      if (autoscrollingTimeoutRef.current !== null) {
        window.clearTimeout(autoscrollingTimeoutRef.current);
        autoscrollingTimeoutRef.current = null;
      }

      if (pendingScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingScrollFrameRef.current);
        pendingScrollFrameRef.current = null;
      }

      if (pendingFollowScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFollowScrollFrameRef.current);
        pendingFollowScrollFrameRef.current = null;
      }

      visibilityObserverRef.current?.disconnect();
      visibilityObserverRef.current = null;
    },
    [
      autoscrollingTimeoutRef,
      pendingScrollFrameRef,
      pendingFollowScrollFrameRef,
      stateFrameRef,
      visibilityFrameRef,
      visibilityObserverRef,
    ]
  );

  React.useLayoutEffect(() => {
    if (autoScroll && modeRef.current === 'following-bottom' && itemCountRef.current > 0) {
      scrollToEnd({ behavior: 'auto' });
      return;
    }

    commitScrollState();
  }, [autoScroll, autoScrollResetKey, commitScrollState, itemCountRef, modeRef, scrollToEnd]);

  return {
    context,
    registerMessage,
  };
}

function useLatestRef<TValue>(value: TValue) {
  const ref = React.useRef(value);
  ref.current = value;

  return ref;
}

const MessageScrollerContext = React.createContext<MessageScrollerContextValue | null>(null);
const MessageScrollerItemContext = React.createContext<RegisterMessage | null>(null);

function useMessageScrollerContext() {
  const context = React.useContext(MessageScrollerContext);

  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useMessageScroller must be used within a MessageScroller.',
    });
  }

  return context;
}

function useMessageScrollerItemContext() {
  const context = React.useContext(MessageScrollerItemContext);

  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'MessageScrollerItem must be used within a MessageScroller.',
    });
  }

  return context;
}

function useMessageScroller() {
  const { scrollToEnd, scrollToEndUnlessUserInterrupted, scrollToMessage, scrollToStart } =
    useMessageScrollerContext();

  return React.useMemo(
    () => ({ scrollToEnd, scrollToEndUnlessUserInterrupted, scrollToMessage, scrollToStart }),
    [scrollToEnd, scrollToEndUnlessUserInterrupted, scrollToMessage, scrollToStart]
  );
}

function useMessageScrollerScrollable() {
  const { stateStore } = useMessageScrollerContext();

  return React.useSyncExternalStore(
    stateStore.subscribe,
    stateStore.getSnapshot,
    stateStore.getSnapshot
  );
}

function useMessageScrollerVisibility() {
  const { observeVisibility, unobserveVisibility, visibilityStore } = useMessageScrollerContext();
  const subscribe = React.useCallback(
    (listener: () => void) =>
      visibilityStore.subscribe(listener, observeVisibility, unobserveVisibility),
    [observeVisibility, unobserveVisibility, visibilityStore]
  );

  return React.useSyncExternalStore(
    subscribe,
    visibilityStore.getSnapshot,
    visibilityStore.getSnapshot
  );
}

function MessageScrollerProvider({
  autoScroll = false,
  autoScrollResetKey,
  children,
  defaultScrollPosition = 'end',
  scrollEdgeThreshold = DEFAULT_SCROLL_EDGE_THRESHOLD,
  scrollPreviousItemPeek = DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK,
  scrollMargin = DEFAULT_SCROLL_MARGIN,
}: MessageScrollerProviderProps) {
  const { context, registerMessage } = useMessageScrollerController({
    autoScroll,
    autoScrollResetKey,
    defaultScrollPosition,
    scrollEdgeThreshold,
    scrollPreviousItemPeek,
    scrollMargin,
  });

  return (
    <MessageScrollerContext.Provider value={context}>
      <MessageScrollerItemContext.Provider value={registerMessage}>
        {children}
      </MessageScrollerItemContext.Provider>
    </MessageScrollerContext.Provider>
  );
}

function MessageScrollerRoot({ children, ref, ...props }: MessageScrollerProps) {
  const { setRootElement } = useMessageScrollerContext();
  const setComposedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      setRootElement(element);
      composeRefs(ref)?.(element);
    },
    [ref, setRootElement]
  );

  return (
    <div ref={setComposedRef} {...props}>
      {children}
    </div>
  );
}

function MessageScrollerViewport({
  'aria-label': ariaLabel,
  children,
  onKeyDown,
  onScroll,
  onTouchMove,
  onWheel,
  preserveScrollOnPrepend = true,
  ref,
  role,
  tabIndex,
  ...props
}: MessageScrollerViewportProps) {
  const {
    handleResize,
    preserveScrollOnPrependRef,
    setViewportElement,
    syncAfterScroll,
    userScrollIntent,
    viewportRef,
  } = useMessageScrollerContext();
  preserveScrollOnPrependRef.current = preserveScrollOnPrepend;
  const setComposedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      setViewportElement(element);
      composeRefs(ref)?.(element);
    },
    [ref, setViewportElement]
  );

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    syncAfterScroll();
    onScroll?.(event);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    userScrollIntent();
    onWheel?.(event);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    userScrollIntent();
    onTouchMove?.(event);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (SCROLL_INTENT_KEYS.has(event.key)) {
      userScrollIntent();
    }

    onKeyDown?.(event);
  }

  React.useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [handleResize, viewportRef]);

  return (
    <div
      ref={setComposedRef}
      role={role ?? 'region'}
      aria-label={ariaLabel ?? 'Messages'}
      tabIndex={tabIndex ?? 0}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
      {...props}
    >
      {children}
    </div>
  );
}

function MessageScrollerContent({
  'aria-relevant': ariaRelevant,
  children,
  ref,
  role,
  spacerClassName,
  ...props
}: MessageScrollerContentProps) {
  const { handleContentChange, handleResize, setContentElement, setSpacerElement } =
    useMessageScrollerContext();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const setComposedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
      setContentElement(element);
      composeRefs(ref)?.(element);
    },
    [ref, setContentElement]
  );

  React.useLayoutEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    handleContentChange();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const mutationObserver = new MutationObserver(() => {
      handleContentChange();
    });
    mutationObserver.observe(content, { childList: true });

    return () => mutationObserver.disconnect();
  }, [handleContentChange]);

  React.useEffect(() => {
    const content = contentRef.current;

    if (!content || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [handleResize]);

  return (
    <div
      ref={setComposedRef}
      role={role ?? 'log'}
      aria-relevant={ariaRelevant ?? 'additions'}
      {...props}
    >
      {children}
      <div
        ref={setSpacerElement}
        aria-hidden="true"
        data-message-scroller-spacer=""
        hidden
        className={spacerClassName}
      />
    </div>
  );
}

function MessageScrollerItem({
  messageId,
  ref,
  scrollAnchor = false,
  ...props
}: MessageScrollerItemProps) {
  const registerMessage = useMessageScrollerItemContext();
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const setComposedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      const previousElement = itemRef.current;
      itemRef.current = element;

      if (messageId) {
        registerMessage(messageId, element, previousElement);
      }

      composeRefs(ref)?.(element);
    },
    [messageId, ref, registerMessage]
  );

  return (
    <div
      ref={setComposedRef}
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? 'true' : 'false'}
      {...props}
    />
  );
}

function MessageScrollerButton({
  behavior = 'smooth',
  children,
  direction = 'end',
  onClick,
  render,
  tabIndex,
  type = 'button',
  ...props
}: MessageScrollerButtonProps) {
  const { scrollToEnd, scrollToStart, stateStore } = useMessageScrollerContext();
  const onClickRef = useLatestRef(onClick);
  const subscribe = React.useCallback(
    (listener: () => void) => stateStore.subscribe(listener),
    [stateStore]
  );
  const getSnapshot = React.useCallback(() => {
    const state = stateStore.getSnapshot();

    return direction === 'start' ? state.start : state.end;
  }, [direction, stateStore]);
  const isActive = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!isActive) {
        return;
      }

      onClickRef.current?.(event);

      if (event.defaultPrevented) {
        return;
      }

      event.currentTarget.blur();

      if (direction === 'start') {
        scrollToStart({ behavior });
      } else {
        scrollToEnd({ behavior });
      }
    },
    [behavior, direction, isActive, onClickRef, scrollToEnd, scrollToStart]
  );

  return renderComponent({
    defaultTagName: 'button',
    props: mergeProps(
      {
        type,
        inert: !isActive,
        tabIndex: isActive ? tabIndex : -1,
        children: children ?? <span>Scroll to {direction}</span>,
        onClick: handleClick,
      },
      props
    ),
    render,
    state: {
      active: isActive,
      direction,
    },
    stateAttributesMapping: {
      active: (active) => ({
        'data-active': active ? 'true' : 'false',
      }),
    },
  });
}

const MessageScroller = {
  Provider: MessageScrollerProvider,
  Root: MessageScrollerRoot,
  Viewport: MessageScrollerViewport,
  Content: MessageScrollerContent,
  Item: MessageScrollerItem,
  Button: MessageScrollerButton,
};

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerRoot,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
export type {
  MessageScrollerButtonDirection,
  MessageScrollerButtonProps,
  MessageScrollerDefaultScrollPosition,
  MessageScrollerProps,
  MessageScrollerScrollable,
  MessageScrollerScrollAlign,
  MessageScrollerScrollOptions,
  MessageScrollerVisibilityState,
};
