/**
 * WelcomeConfigurable：可配置 Welcome 屏（Title + starter blocks）。
 * 新建对话只改 Chat/welcome 里的配置，组件从本目录取。
 */
export { default as WelcomeStarter } from './Starter';
/** @deprecated 使用 WelcomeStarter */
export { default as WelcomeConfigurable } from './Starter';
export { default as WelcomeTitle } from './WelcomeTitle';
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
export { default as ChatWelcomeHero } from './WelcomeTitle';
export type { WelcomeTitleProps } from './WelcomeTitle/index.type';
