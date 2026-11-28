import type { SkillFileNode } from '@/domains/Skill';

const SKILL_IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

function getSkillFilePath(file: SkillFileNode): string {
  const path = file.path === '/' ? '' : file.path;
  return `${path}/${file.name}`;
}

function findSkillFileByPath(nodes: SkillFileNode[], path: string): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file' && getSkillFilePath(node) === path) return node;
    const child = node.children ? findSkillFileByPath(node.children, path) : null;
    if (child) return child;
  }
  return null;
}

export function isMarkdownSkillFile(file: SkillFileNode): boolean {
  return file.name.toLowerCase().endsWith('.md');
}

export function isSkillImageFile(file: SkillFileNode): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SKILL_IMAGE_EXTENSIONS.has(extension);
}

export function inferImageMimeType(file: SkillFileNode): string {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'jpg') return 'image/jpeg';
  if (extension === 'svg') return 'image/svg+xml';
  return `image/${extension}`;
}

export function resolveRelativeSkillFile(
  nodes: SkillFileNode[],
  sourceFile: SkillFileNode,
  rawUrl: string
): SkillFileNode | null {
  if (rawUrl.startsWith('#') || rawUrl.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(rawUrl)) {
    return null;
  }

  try {
    const url = new URL(rawUrl, `https://skill.local${getSkillFilePath(sourceFile)}`);
    return findSkillFileByPath(nodes, decodeURIComponent(url.pathname));
  } catch {
    return null;
  }
}

export function collectMarkdownResourceUrls(content: string): string[] {
  const urls = new Set<string>();
  const inlineLinkPattern = /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))[^)]*\)/g;
  const definitionPattern = /^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|([^\s]+))/gm;

  for (const pattern of [inlineLinkPattern, definitionPattern]) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(content))) {
      const url = match[1] ?? match[2];
      if (url) urls.add(url);
    }
  }

  return [...urls];
}

export function readMarkdownPreviewOffset(container: HTMLDivElement): number | null {
  const markers = Array.from(
    container.querySelectorAll<HTMLElement>('[data-markdown-start-offset]')
  );
  const containerTop = container.getBoundingClientRect().top;
  const visibleMarker = markers.find(
    (marker) => marker.getBoundingClientRect().bottom > containerTop
  );
  const target = visibleMarker ?? markers.at(-1);
  const value = target?.dataset.markdownStartOffset;
  return value && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function scrollMarkdownPreviewToOffset(
  container: HTMLDivElement,
  sourceOffset: number
): void {
  const markers = Array.from(
    container.querySelectorAll<HTMLElement>('[data-markdown-start-offset]')
  );
  const target = markers.reduce<HTMLElement | null>((closest, marker) => {
    const offset = Number(marker.dataset.markdownStartOffset);
    if (!Number.isFinite(offset) || offset > sourceOffset) return closest;
    return marker;
  }, null);
  if (!target) return;

  container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top;
}
