import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import i18n from '@/i18n';

import type {
  NoteAiDiffActionTarget,
  NoteAiDiffComparisonContext,
  NoteAiDiffProjection,
  NoteBlockAiDiff,
  NotePluginRegistry,
} from '../../registry/types';
import type { NoteAiDiffActionRequest } from './action';
import styles from './style.module.less';

export interface AiDiffReviewUnit {
  key: string;
  blockId: string;
  target?: NoteAiDiffActionTarget;
}

export interface AiDiffReviewNavigation {
  index: number;
  total: number;
  prevKey: string | null;
  nextKey: string | null;
}

type ReviewIcon = 'accept' | 'discard' | 'previous' | 'next';

const REVIEW_ICON_PATHS: Record<ReviewIcon, readonly string[]> = {
  accept: ['M20 6 9 17l-5-5'],
  discard: ['M18 6 6 18', 'M6 6l12 12'],
  previous: ['M6 15l6-6 6 6'],
  next: ['M6 9l6 6 6-6'],
};

function createReviewIcon(kind: ReviewIcon): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add(styles.toolbarIcon);
  REVIEW_ICON_PATHS[kind].forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.25');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.appendChild(path);
  });
  return icon;
}

function createToolbarButton(params: {
  className: string;
  label: string;
  onClick?: () => void;
}): HTMLButtonElement {
  const { className, label, onClick } = params;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.disabled = !onClick;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  if (onClick) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }
  return button;
}

function createActionButton(params: {
  action: 'accept' | 'discard';
  request: NoteAiDiffActionRequest;
  onAction: (request: NoteAiDiffActionRequest) => void;
}): HTMLButtonElement {
  const { action, request, onAction } = params;
  const accept = action === 'accept';
  const shortcut = accept ? 'Enter' : 'Esc';
  const label = accept
    ? i18n.t('aiDiff.acceptChange', { ns: 'note', shortcut })
    : i18n.t('aiDiff.rejectChange', { ns: 'note' });
  const button = createToolbarButton({
    className: `${styles.blockAction} ${accept ? styles.blockAccept : styles.blockDiscard}`,
    label,
    onClick: () => onAction(request),
  });
  button.appendChild(createReviewIcon(action));
  const kbd = document.createElement('kbd');
  kbd.className = styles.shortcutKbd;
  kbd.textContent = shortcut;
  button.appendChild(kbd);
  return button;
}

function createNavigationButton(params: {
  direction: 'previous' | 'next';
  changeKey: string | null;
  onSelectChange: (changeKey: string) => void;
}): HTMLButtonElement {
  const { direction, changeKey, onSelectChange } = params;
  const button = createToolbarButton({
    className: styles.navButton,
    label: i18n.t(direction === 'previous' ? 'aiDiff.previousChange' : 'aiDiff.nextChange', {
      ns: 'note',
    }),
    onClick: changeKey ? () => onSelectChange(changeKey) : undefined,
  });
  button.appendChild(createReviewIcon(direction));
  return button;
}

function createSegmentToolbar(params: {
  blockId: string;
  target?: NoteAiDiffActionTarget;
  navigation: AiDiffReviewNavigation;
  onAction: (request: NoteAiDiffActionRequest) => void;
  onSelectChange: (changeKey: string) => void;
}): HTMLElement {
  const { blockId, target, navigation, onAction, onSelectChange } = params;
  const toolbar = document.createElement('div');
  toolbar.className = styles.blockActions;

  const navigator = document.createElement('div');
  navigator.className = styles.segmentNavigator;
  navigator.appendChild(
    createNavigationButton({
      direction: 'previous',
      changeKey: navigation.prevKey,
      onSelectChange,
    })
  );
  const counter = document.createElement('span');
  counter.className = styles.navCounter;
  counter.textContent = `${navigation.index} / ${navigation.total}`;
  navigator.appendChild(counter);
  navigator.appendChild(
    createNavigationButton({
      direction: 'next',
      changeKey: navigation.nextKey,
      onSelectChange,
    })
  );
  toolbar.appendChild(navigator);

  const decisions = document.createElement('div');
  decisions.className = styles.segmentDecision;
  decisions.appendChild(
    createActionButton({
      action: 'discard',
      request: { blockId, action: 'discard', target },
      onAction,
    })
  );
  decisions.appendChild(
    createActionButton({
      action: 'accept',
      request: { blockId, action: 'accept', target },
      onAction,
    })
  );
  toolbar.appendChild(decisions);
  return toolbar;
}

function pinToolbar(toolbar: HTMLElement, host: HTMLElement, anchor: HTMLElement): void {
  host.appendChild(toolbar);
  window.requestAnimationFrame(() => {
    if (!toolbar.isConnected) return;
    const hostRect = host.getBoundingClientRect();
    const rowRect = (anchor.closest('.bn-block') ?? host).getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    toolbar.style.top = `${anchorRect.top - hostRect.top + anchorRect.height / 2}px`;
    toolbar.style.left = `${rowRect.right - hostRect.left}px`;
  });
}

function isSameTarget(left: NoteAiDiffActionTarget | undefined, right: NoteAiDiffActionTarget) {
  return (
    left?.kind === right.kind &&
    (right.kind === 'content-hunk' || (left.kind === 'inline-hunk' && left.index === right.index))
  );
}

function readHeadingLevel(block: Record<string, unknown>): number | undefined {
  const props = block.props;
  if (typeof props !== 'object' || props === null) return undefined;
  const level = (props as Record<string, unknown>).level;
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6
    ? level
    : undefined;
}

export function createAiDiffReviewWidget(params: {
  blockId: string;
  contentType: string;
  projection: NoteAiDiffProjection;
  displayMode: AiDiffDisplayMode;
  actionsEnabled: boolean;
  selectedChangeKey: string | null;
  units: readonly AiDiffReviewUnit[];
  navigationByKey: ReadonlyMap<string, AiDiffReviewNavigation>;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  onSelectChange: (changeKey: string) => void;
  aiDiff: NoteBlockAiDiff;
  registry: NotePluginRegistry;
}): HTMLElement {
  const {
    blockId,
    contentType,
    projection,
    displayMode,
    actionsEnabled,
    selectedChangeKey,
    units,
    navigationByKey,
    onAction,
    onSelectChange,
    aiDiff,
    registry,
  } = params;
  const blockUnit = units.length === 1 && !units[0]!.target ? units[0] : undefined;
  const selected = units.some((unit) => unit.key === selectedChangeKey);
  const usesHunks = units.some((unit) => Boolean(unit.target));
  const customComparison = Boolean(
    displayMode === AI_DIFF_DISPLAY_MODE.COMPARE &&
    !projection.currentEmpty &&
    !projection.aiContentEmpty &&
    aiDiff.comparison
  );

  const root = document.createElement('div');
  root.className = selected ? `${styles.review} ${styles.reviewSelected}` : styles.review;
  root.contentEditable = 'false';
  root.dataset.aiDiffReview = blockId;
  root.dataset.aiDiffContentType = contentType;
  root.dataset.aiDiffChangeKind = projection.changeKind;
  root.dataset.aiDiffDisplayMode = displayMode;
  if (contentType === 'heading') {
    const headingLevel = readHeadingLevel(projection.aiBlock);
    if (headingLevel !== undefined) root.dataset.aiDiffHeadingLevel = String(headingLevel);
  }
  if (blockUnit) root.dataset.aiDiffChangeKey = blockUnit.key;
  if (selected) root.dataset.aiDiffSelected = 'true';

  if (blockUnit) {
    root.addEventListener(
      'mousedown',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('button')) onSelectChange(blockUnit.key);
      },
      true
    );
  }

  if (!projection.aiContentEmpty) {
    const aiContentRoot = document.createElement('div');
    aiContentRoot.className = customComparison
      ? styles.comparison
      : displayMode === AI_DIFF_DISPLAY_MODE.COMPARE
        ? styles.aiContent
        : styles.aiContentPlain;
    aiContentRoot.dataset.aiDiffText = 'true';

    const comparisonContext: NoteAiDiffComparisonContext | undefined =
      customComparison && actionsEnabled && onAction && usesHunks
        ? {
            decorateHunk: (element, target) => {
              const unit = units.find((item) => isSameTarget(item.target, target));
              if (!unit) return;
              const navigation = navigationByKey.get(unit.key);
              const hunkSelected = selectedChangeKey === unit.key;
              element.dataset.aiDiffChangeKey = unit.key;
              element.classList.add(styles.inlineHunkSelectable);
              if (hunkSelected) {
                element.dataset.aiDiffSelected = 'true';
                element.classList.add(styles.inlineHunkSelected);
              }
              element.addEventListener('mousedown', (event) => {
                event.stopPropagation();
                const targetElement = event.target as HTMLElement | null;
                if (!targetElement?.closest('button')) onSelectChange(unit.key);
              });
              if (hunkSelected && navigation) {
                pinToolbar(
                  createSegmentToolbar({
                    blockId,
                    target: unit.target,
                    navigation,
                    onAction,
                    onSelectChange,
                  }),
                  root,
                  element
                );
              }
            },
          }
        : undefined;

    aiContentRoot.appendChild(
      customComparison && aiDiff.comparison
        ? aiDiff.comparison.render(
            projection.current,
            projection.aiBlock,
            registry,
            comparisonContext
          )
        : aiDiff.renderAiContent(projection.aiBlock, registry)
    );
    root.appendChild(aiContentRoot);
  }

  const blockNavigation = blockUnit ? navigationByKey.get(blockUnit.key) : undefined;
  if (blockUnit && blockNavigation && onAction) {
    root.appendChild(
      createSegmentToolbar({
        blockId,
        target: blockUnit.target,
        navigation: blockNavigation,
        onAction,
        onSelectChange,
      })
    );
  }
  return root;
}
