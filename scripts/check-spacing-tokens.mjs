/**
 * 间距 token 守卫。
 *
 * 1. 组件与业务样式不得在 gap、margin、padding 中硬编码公共间距刻度；
 * 2. `--space-*` 只能引用 spacing.css 中已定义的刻度；
 * 3. 间距刻度只在 theme/spacing.css 定义。
 *
 * 局部光学修正和不可由公共刻度表达的组件布局值可以保留字面量。
 * 规范见 agent/docs/component-style.md 第五节。
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');
const stylesDir = join(srcDir, 'styles');
const spacingFile = join(stylesDir, 'theme', 'spacing.css');
const styleExtensions = new Set(['.css', '.scss']);
const scriptExtensions = new Set(['.ts', '.tsx']);
const propertyPattern =
  /(?:^|[;{]\s*)((?:gap|row-gap|column-gap|margin(?:-[a-z-]+)?|padding(?:-[a-z-]+)?))\s*:\s*([^;{}]+)/gm;
const pixelPattern = /(?<![\w-])(-?\d+(?:\.\d+)?)px\b/g;
const spaceDefinitionPattern = /--space-[a-z0-9-]+\s*:/g;
const spaceReferencePattern = /var\(\s*(--space-[a-z0-9-]+)/g;

async function collectFiles(dir, files) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectFiles(fullPath, files);
      continue;
    }

    const extension = extname(entry.name);
    if (styleExtensions.has(extension) || scriptExtensions.has(extension)) files.push(fullPath);
  }

  return files;
}

function toLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function toSummary(value) {
  const summary = value.replace(/\s+/g, ' ').trim();
  return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
}

const spacingSource = await readFile(spacingFile, 'utf8');
const scalePixels = new Set(
  [...spacingSource.matchAll(/--space-[a-z0-9-]+\s*:\s*(\d+(?:\.\d+)?)px/g)].map(
    ([, pixels]) => pixels
  )
);
const definedSpacingTokens = new Set(
  [...spacingSource.matchAll(/--space-[a-z0-9-]+(?=\s*:)/g)].map(([name]) => name)
);
const violations = [];
const files = await collectFiles(srcDir, []);
let styleFileCount = 0;

for (const file of files) {
  const location = relative(root, file).split(sep).join('/');
  const isStyle = styleExtensions.has(extname(file));
  if (isStyle) styleFileCount += 1;

  const raw = await readFile(file, 'utf8');

  for (const match of raw.matchAll(spaceReferencePattern)) {
    if (definedSpacingTokens.has(match[1])) continue;
    const line = toLineNumber(raw, match.index);
    violations.push(`${location}:${line} 引用了未定义的间距 token：${match[1]}`);
  }

  if (!isStyle) continue;

  if (file !== spacingFile && [...raw.matchAll(spaceDefinitionPattern)].length > 0) {
    violations.push(`${location} 只能在 theme/spacing.css 定义 --space-* 刻度`);
  }

  if (file.startsWith(`${stylesDir}${sep}`)) continue;

  for (const match of raw.matchAll(propertyPattern)) {
    const value = match[2];
    const literals = [...value.matchAll(pixelPattern)]
      .map(([, pixels]) => pixels.replace('-', ''))
      .filter((pixels) => scalePixels.has(pixels));

    if (literals.length === 0) continue;

    const line = toLineNumber(raw, match.index);
    violations.push(`${location}:${line} 间距声明应使用 --space-* token：${toSummary(match[0])}`);
  }
}

if (violations.length > 0) {
  console.error(`间距 token 检查未通过，共 ${violations.length} 处：\n`);
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('');
  console.error('公共间距刻度定义见 src/styles/theme/spacing.css。');
  console.error('规范见 agent/docs/component-style.md 第五节。');
  process.exit(1);
}

console.log(`间距 token 检查通过，已扫描 ${styleFileCount} 个样式文件。`);
