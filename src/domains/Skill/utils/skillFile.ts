export const SKILL_ROOT_PATH = '/';

const LANGUAGE_BY_EXTENSION = new Map<string, string>([
  ['md', 'markdown'],
  ['py', 'python'],
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['json', 'json'],
  ['yml', 'yaml'],
  ['yaml', 'yaml'],
  ['html', 'html'],
  ['css', 'css'],
  ['less', 'less'],
  ['sh', 'shell'],
  ['bash', 'shell'],
  ['zsh', 'shell'],
  ['ps1', 'powershell'],
  ['bat', 'bat'],
  ['cmd', 'bat'],
  ['ini', 'ini'],
  ['env', 'ini'],
  ['xml', 'xml'],
  ['java', 'java'],
  ['go', 'go'],
  ['rs', 'rust'],
  ['rb', 'ruby'],
  ['pl', 'perl'],
]);

export function normalizeSkillDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === SKILL_ROOT_PATH) return SKILL_ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(SKILL_ROOT_PATH)
    ? trimmed
    : `${SKILL_ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(SKILL_ROOT_PATH)
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function resolveSkillFileLanguage(name: string): string {
  if (name.toLowerCase() === 'dockerfile') return 'dockerfile';
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_BY_EXTENSION.get(extension) ?? 'plaintext';
}
