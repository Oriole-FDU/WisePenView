import type { WelcomeScreenConfig } from './Starter/index.type';

/**
 * 主 Chat 新建对话当前 Welcome 配置（仅 Hero；需要 starter 时改 blocks 或传 welcomeConfig）。
 * Hero 图标/文案可在 `hero` 上覆盖，例如：
 * `{ iconSrc: '/custom.png', title: '开始写作' }`；不传则沿用主题 Logo + 默认问候。
 */
export const NEW_CHAT_WELCOME_CONFIG: WelcomeScreenConfig = {
  showHero: true,
  blocks: [],
};
