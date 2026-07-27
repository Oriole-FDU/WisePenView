/** 应用侧栏（App / Workspace） */
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 420;
/** App / Workspace 侧栏收起后占位 */
export const SIDEBAR_COLLAPSED_WIDTH = 0;

export const ADMIN_SIDEBAR_COLLAPSED_WIDTH = 80;

/** 主内容区 Panel 下限*/
export const MAIN_MIN_WIDTH = 560;

/**
 * App 壳主区下限
 */
export const APP_MAIN_MIN_WIDTH = 720;

/**
 * 笔记等资源主滚动区下限。
 */
export const MAIN_SCROLL_MIN_WIDTH = 400;

/**
 * 笔记编辑区本体下限
 */
export const NOTE_EDITOR_MIN_WIDTH = 560;

/** 笔记大纲展开/收起占位 */
export const NOTE_OUTLINE_OPEN_WIDTH = 260;
export const NOTE_OUTLINE_COLLAPSED_WIDTH = 40;

/** Chat 侧栏/分栏面板下限 */
export const CHAT_PANEL_MIN_WIDTH = 480;
/**
 * Chat fullWidth 页最小宽
 */
export const CHAT_FULL_WIDTH_MIN_WIDTH = 720;
export const WORKSPACE_CHAT_PANEL_MAX_WIDTH = 1020;
export const ZEN_CHAT_PANEL_MAX_WIDTH = 720;

/** Zen 单侧资源栏 */
export const ZEN_RESOURCE_PANE_MIN_WIDTH = 320;

/** 分栏拖拽条预留 */
export const LAYOUT_RESIZE_HANDLE_RESERVE = 24;

/** Workspace 下限：侧栏 + 主区 + Chat */
export const WORKSPACE_THREE_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + MAIN_MIN_WIDTH + CHAT_PANEL_MIN_WIDTH;

/** Zen：双资源栏 + Chat */
export const ZEN_THREE_COLUMN_MIN_WIDTH = ZEN_RESOURCE_PANE_MIN_WIDTH * 2 + CHAT_PANEL_MIN_WIDTH;

/** App 双栏（侧栏展开 + 主区）下限 */
export const APP_TWO_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + APP_MAIN_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

/** Workspace 双栏（侧栏展开 + 主区）下限 */
export const WORKSPACE_TWO_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + MAIN_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

/**
 * Workspace 内层（笔记编辑区 + Chat）下限。
 */
export const WORKSPACE_INNER_WITH_CHAT_MIN_WIDTH =
  NOTE_EDITOR_MIN_WIDTH + CHAT_PANEL_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

/** 评论/批注栏默认最小宽 */
export const RESOURCE_SIDE_PANEL_MIN_WIDTH = 280;

/**
 * 笔记 + 评论/批注同时打开时的下限。
 */
export const NOTE_WITH_SIDE_PANEL_MIN_WIDTH =
  NOTE_EDITOR_MIN_WIDTH + RESOURCE_SIDE_PANEL_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

export const LAYOUT_COMPACT_MAX_WIDTH = WORKSPACE_THREE_COLUMN_MIN_WIDTH;

/** fullWidth ChatInput 窄于此宽度时，模型按钮改为仅图标 */
export const FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH = 800;

/** fullWidth 下带名称的模型按钮最大宽 */
export const MODEL_SELECTOR_LABEL_MAX_WIDTH = 240;

/** 壳层高度预算 */
export const CHAT_HEADER_MIN_HEIGHT = 56;
export const CHAT_MESSAGE_MIN_HEIGHT = 160;
export const CHAT_INPUT_COMPACT_HEIGHT = 120;
export const WORKSPACE_HEADER_MIN_HEIGHT = 56;

/** App 侧栏固定*/
export const SIDEBAR_HEADER_TOP_HEIGHT = 64;
export const SIDEBAR_NAV_MIN_HEIGHT = 140;
export const SIDEBAR_TAB_TOOLBAR_HEIGHT = 40;
export const SIDEBAR_PROFILE_HEIGHT = 60;
/** 会话列表区下限*/
export const SIDEBAR_SESSION_LIST_MIN_HEIGHT = 120;

/**
 * 左侧栏可用最小高
 */
export const SIDEBAR_MIN_HEIGHT =
  SIDEBAR_HEADER_TOP_HEIGHT +
  SIDEBAR_NAV_MIN_HEIGHT +
  SIDEBAR_TAB_TOOLBAR_HEIGHT +
  SIDEBAR_SESSION_LIST_MIN_HEIGHT +
  SIDEBAR_PROFILE_HEIGHT;

/** 低于此视口高度启用 short 密度 */
export const LAYOUT_SHORT_MAX_HEIGHT = 720;

/** Drive 表区域相对视口扣除的顶栏+页头+tabs */
export const DRIVE_LAYOUT_CHROME_HEIGHT_NORMAL = 240;
export const DRIVE_LAYOUT_CHROME_HEIGHT_SHORT = 180;

/** Drive 右侧详情栏固定宽 */
export const DRIVE_DETAIL_PANEL_WIDTH = 300;
/**
 * TableDrive 列表区下限（不含详情栏）。
 */
export const DRIVE_TABLE_MIN_WIDTH = 560;
/** TableDrive 整体（列表 + 详情）下限 */
export const DRIVE_LAYOUT_MIN_WIDTH = DRIVE_TABLE_MIN_WIDTH + DRIVE_DETAIL_PANEL_WIDTH;
/**
 * 云盘页面下限（含页边距）：窄于此时整页横向滚动，保持表+详情左右布局。
 */
export const DRIVE_PAGE_MIN_WIDTH = DRIVE_LAYOUT_MIN_WIDTH + 96;

export const CHAT_FOOTER_SCROLL_OFFSET_NORMAL = 132;
export const CHAT_FOOTER_SCROLL_OFFSET_SHORT = 100;

/**
 * Electron 窗口最小宽
 */
export const WINDOW_MIN_WIDTH =
  Math.max(WORKSPACE_THREE_COLUMN_MIN_WIDTH, ZEN_THREE_COLUMN_MIN_WIDTH) +
  LAYOUT_RESIZE_HANDLE_RESERVE;

/**
 * 窗口最小高：覆盖侧栏可用高度
 */
export const WINDOW_MIN_HEIGHT = Math.max(
  SIDEBAR_MIN_HEIGHT,
  LAYOUT_SHORT_MAX_HEIGHT,
  WORKSPACE_HEADER_MIN_HEIGHT +
    CHAT_MESSAGE_MIN_HEIGHT +
    CHAT_INPUT_COMPACT_HEIGHT +
    LAYOUT_RESIZE_HANDLE_RESERVE
);

export const WINDOW_DEFAULT_WIDTH = 1440;
export const WINDOW_DEFAULT_HEIGHT = 960;

export const LAYOUT_DENSITY = {
  COMPACT: 'compact',
  NORMAL: 'normal',
} as const;

export type LayoutDensity = (typeof LAYOUT_DENSITY)[keyof typeof LAYOUT_DENSITY];

export const LAYOUT_HEIGHT_DENSITY = {
  SHORT: 'short',
  NORMAL: 'normal',
} as const;

export type LayoutHeightDensity =
  (typeof LAYOUT_HEIGHT_DENSITY)[keyof typeof LAYOUT_HEIGHT_DENSITY];

export const resolveLayoutDensity = (viewportWidth: number): LayoutDensity =>
  viewportWidth < LAYOUT_COMPACT_MAX_WIDTH ? LAYOUT_DENSITY.COMPACT : LAYOUT_DENSITY.NORMAL;

export const resolveLayoutHeightDensity = (viewportHeight: number): LayoutHeightDensity =>
  viewportHeight < LAYOUT_SHORT_MAX_HEIGHT
    ? LAYOUT_HEIGHT_DENSITY.SHORT
    : LAYOUT_HEIGHT_DENSITY.NORMAL;

export const clampSidebarWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

export const clampWorkspaceChatPanelWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), CHAT_PANEL_MIN_WIDTH), WORKSPACE_CHAT_PANEL_MAX_WIDTH);

export const clampZenChatPanelWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), CHAT_PANEL_MIN_WIDTH), ZEN_CHAT_PANEL_MAX_WIDTH);

export interface LayoutScaleCssVarOptions {
  heightDensity?: LayoutHeightDensity;
}

/** 写入 documentElement*/
export const getLayoutScaleCssVars = (
  options: LayoutScaleCssVarOptions = {}
): Record<string, string> => {
  const heightDensity = options.heightDensity ?? LAYOUT_HEIGHT_DENSITY.NORMAL;
  const isShort = heightDensity === LAYOUT_HEIGHT_DENSITY.SHORT;
  const driveChrome = isShort
    ? DRIVE_LAYOUT_CHROME_HEIGHT_SHORT
    : DRIVE_LAYOUT_CHROME_HEIGHT_NORMAL;
  const footerOffset = isShort ? CHAT_FOOTER_SCROLL_OFFSET_SHORT : CHAT_FOOTER_SCROLL_OFFSET_NORMAL;

  return {
    '--chat-panel-min-width': `${CHAT_PANEL_MIN_WIDTH}px`,
    '--chat-full-width-min-width': `${CHAT_FULL_WIDTH_MIN_WIDTH}px`,
    '--layout-sidebar-min-width': `${SIDEBAR_MIN_WIDTH}px`,
    '--layout-sidebar-max-width': `${SIDEBAR_MAX_WIDTH}px`,
    '--layout-sidebar-min-height': `${SIDEBAR_MIN_HEIGHT}px`,
    '--layout-sidebar-session-list-min-height': `${SIDEBAR_SESSION_LIST_MIN_HEIGHT}px`,
    '--layout-window-min-height': `${WINDOW_MIN_HEIGHT}px`,
    '--layout-main-min-width': `${MAIN_MIN_WIDTH}px`,
    '--layout-app-main-min-width': `${APP_MAIN_MIN_WIDTH}px`,
    '--layout-main-scroll-min-width': `${MAIN_SCROLL_MIN_WIDTH}px`,
    '--layout-note-editor-min-width': `${NOTE_EDITOR_MIN_WIDTH}px`,
    '--layout-resource-side-panel-min-width': `${RESOURCE_SIDE_PANEL_MIN_WIDTH}px`,
    '--layout-note-with-side-panel-min-width': `${NOTE_WITH_SIDE_PANEL_MIN_WIDTH}px`,
    '--layout-workspace-inner-chat-min-width': `${WORKSPACE_INNER_WITH_CHAT_MIN_WIDTH}px`,
    '--layout-resize-handle-reserve': `${LAYOUT_RESIZE_HANDLE_RESERVE}px`,
    '--layout-note-outline-open-width': `${NOTE_OUTLINE_OPEN_WIDTH}px`,
    '--layout-note-outline-collapsed-width': `${NOTE_OUTLINE_COLLAPSED_WIDTH}px`,
    '--layout-chat-panel-max-width': `${WORKSPACE_CHAT_PANEL_MAX_WIDTH}px`,
    '--layout-model-selector-max-width': `${MODEL_SELECTOR_LABEL_MAX_WIDTH}px`,
    '--layout-compact-max-width': `${LAYOUT_COMPACT_MAX_WIDTH}px`,
    '--layout-short-max-height': `${LAYOUT_SHORT_MAX_HEIGHT}px`,
    '--layout-drive-chrome-height': `${driveChrome}px`,
    '--table-drive-layout-max-height': `calc(100dvh - ${driveChrome}px)`,
    '--table-drive-detail-panel-width': `${DRIVE_DETAIL_PANEL_WIDTH}px`,
    '--layout-drive-table-min-width': `${DRIVE_TABLE_MIN_WIDTH}px`,
    '--layout-drive-layout-min-width': `${DRIVE_LAYOUT_MIN_WIDTH}px`,
    '--layout-drive-page-min-width': `${DRIVE_PAGE_MIN_WIDTH}px`,
    '--layout-chat-footer-scroll-offset': `${footerOffset}px`,
    '--chat-input-textarea-max-height': isShort ? 'calc(6em + 16px)' : 'calc(16em + 16px)',
    '--chat-input-card-padding-block': isShort ? '8px' : '12px',
    '--chat-input-container-padding-block': isShort ? '4px' : '8px',
    '--layout-welcome-icon-size': isShort ? '28px' : '40px',
    '--layout-welcome-title-size': isShort ? '16px' : '18px',
  };
};
