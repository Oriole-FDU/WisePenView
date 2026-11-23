/**
 * Welcome part：按 config 渲染空态屏；改配置改本目录 `newChatWelcome.config.ts`。
 */
export { default as WelcomeScreenHost } from './Host';
export type { WelcomeScreenHostProps } from './Host/index.type';
export { NEW_CHAT_WELCOME_CONFIG } from './newChatWelcome.config';
export type { WelcomeLayoutMode, WelcomeScreenConfig } from './Starter/index.type';
export { welcomeModeFromBlockCount } from './welcomeMode';
