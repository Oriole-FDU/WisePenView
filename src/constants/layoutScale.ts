/** 应用侧栏（App / Workspace） */
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 420;
/** App / Workspace 侧栏收起后占位 */
export const SIDEBAR_COLLAPSED_WIDTH = 0;
/** Web App 侧栏收起后保留展开按钮的独立区域 */
export const APP_WEB_SIDEBAR_COLLAPSED_WIDTH = 64;

/** 新主布局：窄于该宽度时使用 Header + Drawer */
export const MAIN_SHELL_DRAWER_MAX_WIDTH = 960;
/** 新主布局：窄屏侧栏 Drawer 宽度，取侧栏可用的最小宽度 */
export const MAIN_SHELL_DRAWER_WIDTH = 240;
/** 新主布局：桌面侧栏展开宽度 */
export const MAIN_SIDEBAR_EXPANDED_WIDTH = 288;
/** 新主布局：桌面侧栏收起后的图标轨宽度 */
export const MAIN_SIDEBAR_RAIL_WIDTH = 64;
/** 新主布局：窄屏顶栏最小高度（与 Chat / 资源顶栏同高度节奏） */
export const MAIN_SHELL_MOBILE_HEADER_MIN_HEIGHT = 56;

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
/** 资源宿主主内容下限：避免复用 App 主区下限挤占右侧 Chat 拖拽空间。 */
export const RESOURCE_MAIN_MIN_WIDTH = NOTE_EDITOR_MIN_WIDTH;

/** 笔记大纲展开宽度与收起宽度；对齐飞书文档目录的可读宽度。 */
export const NOTE_OUTLINE_OPEN_WIDTH = 215;
export const NOTE_OUTLINE_COLLAPSED_WIDTH = 40;

/** Chat 侧栏/分栏面板宽度边界：保证输入卡片可读，并限制拖拽到超宽。 */
export const CHAT_PANEL_MIN_WIDTH = 380;
export const CHAT_PANEL_MAX_WIDTH = 1020;
/**
 * Chat fullWidth 页最小宽
 */
export const CHAT_FULL_WIDTH_MIN_WIDTH = 720;

/** 分栏拖拽条预留 */
export const LAYOUT_RESIZE_HANDLE_RESERVE = 24;

/** Workspace 下限：侧栏 + 主区 + Chat */
export const WORKSPACE_THREE_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + MAIN_MIN_WIDTH + CHAT_PANEL_MIN_WIDTH;

/** App 双栏（侧栏展开 + 主区）下限 */
export const APP_TWO_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + APP_MAIN_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

/** Workspace 双栏（侧栏展开 + 主区）下限 */
export const WORKSPACE_TWO_COLUMN_MIN_WIDTH =
  SIDEBAR_MIN_WIDTH + MAIN_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

/** 笔记批注与资源互动等上下文面板的统一宽度边界。 */
export const WORKSPACE_CONTEXT_PANEL_MIN_WIDTH = 320;
export const WORKSPACE_CONTEXT_PANEL_MAX_WIDTH = 560;
export const WORKSPACE_CONTEXT_PANEL_DEFAULT_WIDTH = 360;
export const WORKSPACE_SPLIT_HEADER_HEIGHT = 56;

export const LAYOUT_COMPACT_MAX_WIDTH = MAIN_SHELL_DRAWER_MAX_WIDTH;

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
export const WINDOW_MIN_WIDTH = WORKSPACE_THREE_COLUMN_MIN_WIDTH + LAYOUT_RESIZE_HANDLE_RESERVE;

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

/** 桌面自定义顶栏总高（含上方拖拽带） */
export const DESKTOP_TITLE_BAR_HEIGHT = 56;
/** 顶栏上方专供拖拽的留白 */
export const DESKTOP_TITLE_BAR_DRAG_STRIP = 10;
/** Win 自绘窗口按钮：三枚 32px + 间距 + 右内边距 */
export const DESKTOP_WINDOW_CONTROLS_WIDTH = 116;
/** Mac hiddenInset 红绿灯位置（相对窗口左上） */
export const DESKTOP_MAC_TRAFFIC_LIGHT_POSITION = { x: 20, y: 22 } as const;

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

export const clampChatPanelWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), CHAT_PANEL_MIN_WIDTH), CHAT_PANEL_MAX_WIDTH);

export const clampWorkspaceContextPanelWidth = (width: number): number =>
  Math.min(
    Math.max(Math.round(width), WORKSPACE_CONTEXT_PANEL_MIN_WIDTH),
    WORKSPACE_CONTEXT_PANEL_MAX_WIDTH
  );

export interface LayoutScaleCssVarOptions {
  widthDensity?: LayoutDensity;
  heightDensity?: LayoutHeightDensity;
}

/** 写入 documentElement*/
export const getLayoutScaleCssVars = (
  options: LayoutScaleCssVarOptions = {}
): Record<string, string> => {
  const widthDensity = options.widthDensity ?? LAYOUT_DENSITY.NORMAL;
  const heightDensity = options.heightDensity ?? LAYOUT_HEIGHT_DENSITY.NORMAL;
  const isShort = heightDensity === LAYOUT_HEIGHT_DENSITY.SHORT;
  const isCompact = widthDensity === LAYOUT_DENSITY.COMPACT;
  const driveChrome = isShort
    ? DRIVE_LAYOUT_CHROME_HEIGHT_SHORT
    : DRIVE_LAYOUT_CHROME_HEIGHT_NORMAL;

  return {
    '--desktop-title-bar-height': `${DESKTOP_TITLE_BAR_HEIGHT}px`,
    '--desktop-title-bar-drag-strip': `${DESKTOP_TITLE_BAR_DRAG_STRIP}px`,
    '--desktop-window-controls-width': `${DESKTOP_WINDOW_CONTROLS_WIDTH}px`,
    '--main-shell-drawer-width': `${MAIN_SHELL_DRAWER_WIDTH}px`,
    '--main-shell-mobile-header-height': `${MAIN_SHELL_MOBILE_HEADER_MIN_HEIGHT}px`,
    '--layout-sidebar-session-list-min-height': `${SIDEBAR_SESSION_LIST_MIN_HEIGHT}px`,
    '--layout-note-editor-min-width': `${NOTE_EDITOR_MIN_WIDTH}px`,
    '--layout-workspace-split-header-height': `${WORKSPACE_SPLIT_HEADER_HEIGHT}px`,
    '--layout-note-outline-open-width': `${NOTE_OUTLINE_OPEN_WIDTH}px`,
    '--layout-note-outline-collapsed-width': `${NOTE_OUTLINE_COLLAPSED_WIDTH}px`,
    '--layout-model-selector-max-width': `${MODEL_SELECTOR_LABEL_MAX_WIDTH}px`,
    '--layout-drive-chrome-height': `${driveChrome}px`,
    '--layout-drive-table-min-width': `${DRIVE_TABLE_MIN_WIDTH}px`,
    '--layout-drive-layout-min-width': `${DRIVE_LAYOUT_MIN_WIDTH}px`,
    '--layout-drive-page-min-width': `${DRIVE_PAGE_MIN_WIDTH}px`,
    '--app-page-padding-block-start': isShort ? 'var(--space-md)' : 'var(--space-lg)',
    '--app-page-padding-block-end': isShort ? 'var(--space-md)' : 'var(--space-lg)',
    '--app-page-padding-inline': isCompact ? 'var(--space-lg)' : 'var(--space-xl)',
    '--chat-input-textarea-max-height': isShort ? 'calc(6em + 16px)' : 'calc(16em + 16px)',
    '--chat-input-card-padding-block': isShort ? 'var(--space-xs)' : 'var(--space-sm)',
    '--chat-input-container-padding-block': isShort ? 'var(--space-2xs)' : 'var(--space-xs)',
    '--layout-welcome-title-size': isShort ? '1.5rem' : '2rem',
    '--layout-welcome-icon-size': isShort ? '2.75rem' : '3.75rem',
  };
};
