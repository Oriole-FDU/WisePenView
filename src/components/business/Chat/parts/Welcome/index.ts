/**
 * Welcome part：可配置 Welcome 屏（Title + starter blocks）与新建对话配置。
 * 改配置改本目录 `newChatWelcome.config.ts`。
 */
export { default as WelcomeStarter } from './Starter';
/** @deprecated 使用 WelcomeStarter */
export { default as WelcomeConfigurable } from './Starter';
export { default as WelcomeTitle } from './Title';
/** @deprecated 使用 WelcomeTitle */
export {
  isWelcomeMode,
  useWelcomeScreenOrchestration,
  useWelcomeScreenStore,
  WelcomeMode,
  welcomeModeFromBlockCount,
  welcomeScreenActions,
} from './_store';
export { default as WelcomeScreenHost } from './Host';
export type { WelcomeScreenHostProps } from './Host/index.type';
export { NEW_CHAT_WELCOME_CONFIG } from './newChatWelcome.config';
export type {
  WelcomeConfigurableBlock,
  WelcomeConfigurableProps,
  WelcomeHeroConfig,
  WelcomeIconTone,
  WelcomeLayoutMode,
  WelcomePromptCardItem,
  WelcomePromptCardsAppearance,
  WelcomePromptCardsBlock,
  WelcomePromptPickMeta,
  WelcomeQuestionItem,
  WelcomeQuestionsBlock,
  WelcomeQuestionsShell,
  WelcomeQuestionsVariant,
  WelcomeScreenConfig,
  WelcomeStarterBlock,
  WelcomeStarterProps,
} from './Starter/index.type';
export { default as ChatWelcomeHero } from './Title';
export type { WelcomeTitleProps } from './Title/index.type';
