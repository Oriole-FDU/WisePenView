import type { WelcomeQuestionsBlock, WelcomeStarterProps } from '../index.type';

export interface WelcomeQuestionsSectionProps {
  block: WelcomeQuestionsBlock;
  onPick: WelcomeStarterProps['onPromptPick'];
}
