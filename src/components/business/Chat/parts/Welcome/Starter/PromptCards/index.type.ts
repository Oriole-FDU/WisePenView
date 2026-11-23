import type { WelcomePromptCardsBlock, WelcomeStarterProps } from '../index.type';

export interface WelcomePromptCardsSectionProps {
  block: WelcomePromptCardsBlock;
  onPick: WelcomeStarterProps['onPromptPick'];
}
