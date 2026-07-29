import i18n from '@/i18n';
import type { GuidedPromptFields } from './codec';

export const getDefaultGuidedPromptFields = (): GuidedPromptFields => ({
  overview: i18n.t('defaultPrompt.overview', { ns: 'agent' }),
  context: i18n.t('defaultPrompt.context', { ns: 'agent' }),
  workflow: i18n.t('defaultPrompt.workflow', { ns: 'agent' }),
  outputFormat: i18n.t('defaultPrompt.outputFormat', { ns: 'agent' }),
  exampleOutput: i18n.t('defaultPrompt.exampleOutput', { ns: 'agent' }),
  qualityChecks: i18n.t('defaultPrompt.qualityChecks', { ns: 'agent' }),
  whenToAsk: i18n.t('defaultPrompt.whenToAsk', { ns: 'agent' }),
  soulRole: i18n.t('defaultPrompt.soulRole', { ns: 'agent' }),
  soulStyle: i18n.t('defaultPrompt.soulStyle', { ns: 'agent' }),
  soulInitiative: i18n.t('defaultPrompt.soulInitiative', { ns: 'agent' }),
  soulTaste: i18n.t('defaultPrompt.soulTaste', { ns: 'agent' }),
  soulTruth: i18n.t('defaultPrompt.soulTruth', { ns: 'agent' }),
  soulBoundaries: i18n.t('defaultPrompt.soulBoundaries', { ns: 'agent' }),
});
