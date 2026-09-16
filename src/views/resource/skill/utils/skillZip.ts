import JSZip from 'jszip';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface ParsedSkillZipFile {
  name: string;
  path: string;
  content?: string;
  contentBlob: Blob;
  size: number;
}

export interface ParseSkillZipOptions {
  mainSkillFileName: string;
}

interface ZipEntryCandidate {
  entryPath: string;
  file: JSZip.JSZipObject;
}

const ROOT_PATH = '/';
const SKIPPED_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);
const MACOSX_RESOURCE_PREFIX = '__MACOSX/';
const TEXT_FILE_EXTENSIONS = new Set([
  'md',
  'py',
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'less',
  'html',
  'xml',
  'sh',
  'ps1',
  'bat',
  'cmd',
  'ini',
  'env',
  'gitignore',
  'dockerfile',
  'bash',
  'zsh',
]);

function normalizeZipPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_PATH_INVALID, { path: rawPath });
  }
  if (trimmed.includes('\\')) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_PATH_INVALID, { path: rawPath });
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  if (!withoutLeadingSlash || withoutLeadingSlash.endsWith('/')) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_PATH_INVALID, { path: rawPath });
  }

  const parts = withoutLeadingSlash.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_PATH_UNSAFE, { path: rawPath });
  }
  return withoutLeadingSlash;
}

function shouldSkipZipEntry(path: string): boolean {
  if (path.startsWith(MACOSX_RESOURCE_PREFIX)) return true;
  const name = path.split('/').pop() ?? '';
  return SKIPPED_FILE_NAMES.has(name);
}

function stripSingleTopFolder(entries: ZipEntryCandidate[], mainSkillFileName: string) {
  if (entries.some((entry) => entry.entryPath === mainSkillFileName)) return entries;

  const topFolders = new Set<string>();
  for (const entry of entries) {
    const slashIndex = entry.entryPath.indexOf('/');
    if (slashIndex <= 0) return entries;
    const topFolder = entry.entryPath.slice(0, slashIndex);
    const rest = entry.entryPath.slice(slashIndex + 1);
    if (!topFolder || !rest) return entries;
    topFolders.add(topFolder);
  }

  if (topFolders.size !== 1) return entries;
  const [topFolder] = [...topFolders];
  return entries.map((entry) => ({
    ...entry,
    entryPath: entry.entryPath.slice(topFolder.length + 1),
  }));
}

function validateZipEntries(entries: ZipEntryCandidate[], options: ParseSkillZipOptions) {
  if (entries.length === 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_EMPTY);
  }

  const duplicatedPaths = new Set<string>();
  const seenPaths = new Set<string>();
  for (const entry of entries) {
    if (seenPaths.has(entry.entryPath)) duplicatedPaths.add(entry.entryPath);
    seenPaths.add(entry.entryPath);
  }

  if (duplicatedPaths.size > 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_DUPLICATE_FILE, {
      paths: [...duplicatedPaths].slice(0, 3).join('、'),
    });
  }
  if (!entries.some((entry) => entry.entryPath === options.mainSkillFileName)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_MAIN_FILE_MISSING, {
      fileName: options.mainSkillFileName,
    });
  }
}

function resolveParsedPath(entryPath: string): Pick<ParsedSkillZipFile, 'name' | 'path'> {
  const slashIndex = entryPath.lastIndexOf('/');
  if (slashIndex < 0) return { name: entryPath, path: ROOT_PATH };
  return {
    name: entryPath.slice(slashIndex + 1),
    path: `${ROOT_PATH}${entryPath.slice(0, slashIndex)}`,
  };
}

function isTextLikeFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return TEXT_FILE_EXTENSIONS.has(name.toLowerCase());
  return TEXT_FILE_EXTENSIONS.has(ext);
}

export async function parseSkillZip(
  zipFile: File,
  options: ParseSkillZipOptions
): Promise<ParsedSkillZipFile[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch (error) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_READ_FAILED, undefined, error);
  }
  const candidates: ZipEntryCandidate[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const entryPath = normalizeZipPath(relativePath);
    if (shouldSkipZipEntry(entryPath)) return;
    candidates.push({ entryPath, file });
  });

  const entries = stripSingleTopFolder(candidates, options.mainSkillFileName);
  validateZipEntries(entries, options);

  return Promise.all(
    entries.map(async (entry) => {
      try {
        const contentBlob = await entry.file.async('blob');
        const { name, path } = resolveParsedPath(entry.entryPath);
        const content = isTextLikeFile(name) ? await contentBlob.text() : undefined;
        return {
          name,
          path,
          content,
          contentBlob,
          size: contentBlob.size,
        };
      } catch (error) {
        throw createClientError(
          FRONTEND_CLIENT_ERROR.SKILL_ZIP_READ_FAILED,
          { path: entry.entryPath },
          error
        );
      }
    })
  );
}
