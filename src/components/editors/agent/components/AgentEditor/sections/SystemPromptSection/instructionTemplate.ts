import i18n from '@/i18n';

const templateSections = [
  ['roleTitle', 'role'],
  ['goalTitle', 'goal'],
  ['workflowTitle', 'workflow'],
  ['outputTitle', 'output'],
  ['qualityTitle', 'quality'],
  ['boundariesTitle', 'boundaries'],
] as const;

export function buildInstructionTemplate() {
  return templateSections
    .map(([titleKey, contentKey]) => {
      const title = i18n.t(`prompt.template.${titleKey}`, { ns: 'agent' });
      const content = i18n.t(`prompt.template.${contentKey}`, { ns: 'agent' });
      return `# ${title}\n\n${content}`;
    })
    .join('\n\n');
}
