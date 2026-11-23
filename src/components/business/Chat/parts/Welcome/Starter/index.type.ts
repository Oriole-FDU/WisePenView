import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type WelcomePromptPickSource = 'question' | 'card';

export interface WelcomePromptPickMeta {
  id: string;
  source: WelcomePromptPickSource;
}

/** 与 Chat 壳层 `data-welcome-mode` / starter `data-welcome-starters` 对齐 */
export type WelcomeLayoutMode = 'compact' | 'focused' | 'rich';

export type WelcomeIconTone =
  'orange' | 'sky' | 'violet' | 'amber' | 'indigo' | 'teal' | 'green' | 'rose';

export interface WelcomeQuestionItem {
  id: string;
  label: string;
  prompt: string;
  icon?: LucideIcon;
  iconTone?: WelcomeIconTone;
}

/**
 * list：左对齐整行 + chevron
 * bubbles：竖向气泡推荐
 * pillWrap / wrap：换行 pill
 * pillScroll：横向滚动 pill + 渐隐
 */
export type WelcomeQuestionsVariant = 'list' | 'bubbles' | 'wrap' | 'pillWrap' | 'pillScroll';

export type WelcomeQuestionsShell = 'plain' | 'panel';

export interface WelcomeQuestionsBlock {
  type: 'questions';
  id: string;
  title?: string;
  variant?: WelcomeQuestionsVariant;
  align?: 'center' | 'start';
  /** pillScroll 时可包一层卡片容器 */
  shell?: WelcomeQuestionsShell;
  badge?: string;
  headerIcon?: LucideIcon;
  items: WelcomeQuestionItem[];
}

export interface WelcomePromptCardItem {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  icon?: LucideIcon;
  iconTone?: WelcomeIconTone;
}

/** template：描述 + CTA；feature：彩色圆标 + 标题 */
export type WelcomePromptCardsAppearance = 'template' | 'feature';

export interface WelcomePromptCardsBlock {
  type: 'promptCards';
  id: string;
  title?: string;
  columns?: 2 | 3;
  appearance?: WelcomePromptCardsAppearance;
  showPromptPreview?: boolean;
  items: WelcomePromptCardItem[];
}

export type WelcomeStarterBlock = WelcomeQuestionsBlock | WelcomePromptCardsBlock;

/** @deprecated 使用 WelcomeStarterBlock */
export type WelcomeConfigurableBlock = WelcomeStarterBlock;

/**
 * Hero（Logo + 主文案）配置；可序列化，便于静态 / 接口 / Agent 共用。
 * 需要完全自定义 DOM 时仍用 Host 的 `hero` ReactNode 插槽。
 */
export interface WelcomeHeroConfig {
  /**
   * 图标图片地址。
   * - 不传：主题品牌 Logo
   * - `null`：不展示图标
   * - string：自定义图片 URL
   */
  iconSrc?: string | null;
  /**
   * 主文案。
   * - 不传：默认 i18n 问候（可选带用户名）
   * - string：原样展示
   */
  title?: string;
  /**
   * 仅在未配置 `title` 时生效：默认问候是否插入用户昵称。默认 true。
   */
  greetWithUserName?: boolean;
}

/** Welcome 屏配置协议（静态 / 接口 / Agent 共用） */
export interface WelcomeScreenConfig {
  showHero?: boolean;
  /** Hero 图标与文案；`showHero === false` 时忽略 */
  hero?: WelcomeHeroConfig;
  blocks: WelcomeStarterBlock[];
}

/**
 * 可复用 Starter UI：每次挂载传入独立 config / onPromptPick，可多实例并存。
 * 不依赖 Chat、输入框、Zustand；layoutMode 不传则按当前 config.blocks 数量推导。
 */
export interface WelcomeStarterProps {
  config: WelcomeScreenConfig;
  onPromptPick: (prompt: string, meta: WelcomePromptPickMeta) => void;
  className?: string;
  /** config.showHero !== false 且 hero 有值时渲染顶部区域 */
  hero?: ReactNode;
  layoutMode?: WelcomeLayoutMode;
}

/** @deprecated 使用 WelcomeStarterProps */
export type WelcomeConfigurableProps = WelcomeStarterProps;
