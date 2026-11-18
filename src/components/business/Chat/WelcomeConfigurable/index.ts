/**
 * WelcomeConfigurable：可配置 Welcome 屏（Title + starter blocks）。
 * 新建对话只改 Chat/welcome 里的配置，组件从本目录取。
 */
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
export { default as WelcomeStarter } from './Starter';
export type {
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
export { default as WelcomeTitle } from './Title';
export type { WelcomeTitleProps } from './Title/index.type';
