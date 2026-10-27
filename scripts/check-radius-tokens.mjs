/**
 * 圆角 token 守卫。
 *
 * 组件与业务样式只能引用应用语义圆角（`--app-radius-*`）：
 * 1. 禁止直接引用基础刻度（`--radius`、`--radius-*`），它们只把数值参数化，不表达业务含义；
 * 2. 圆角属性的值只允许 `0`、百分比整圆或 `var(--app-radius-*)`，禁止硬编码数值。
 *
 * `src/styles/**` 是 token 定义与基础设施层，不在检查范围内。
 * 语义缺失时先在 `src/styles/theme/radius.css` 的应用语义层补 token，规则见 `agent/docs/component-style.md`。
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');
/** 基础设施与 token 层：第 1、2 层刻度在此定义，允许直接引用。 */
const infraDir = join(srcDir, 'styles');
const radiusTokenSource = await readFile(join(infraDir, 'theme/radius.css'), 'utf8');
const styleExtensions = new Set(['.less', '.scss', '.css']);

/** 圆角属性，例如 border-radius、border-start-start-radius。 */
const radiusPropertyPattern = /([a-z-]*radius)\s*:\s*([^;]*)/i;
/** 基础刻度引用，例如 var(--radius-lg)。 */
const baseScalePattern = /var\(\s*--radius(?:-[a-z0-9]+)?\b/;
/** 数值字面量，例如 16px、10px、999px。 */
const numericPattern = /(?<![\w-])(\d*\.?\d+)(px|rem|em|%|vh|vw)\b/g;
/** 百分比整圆与重置值可以保留字面量。 */
const allowedLiterals = new Set(['50%', '100%']);

async function collectStyleFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (fullPath === infraDir) continue;
      files.push(...(await collectStyleFiles(fullPath)));
      continue;
    }

    if (styleExtensions.has(extname(entry.name))) files.push(fullPath);
  }

  return files;
}

const violations = [];

if (!/--field-radius\s*:\s*var\(--app-radius-field\)/.test(radiusTokenSource)) {
  violations.push('src/styles/theme/radius.css 缺少 --field-radius 到 --app-radius-field 的桥接');
}

const files = await collectStyleFiles(srcDir);

for (const file of files) {
  const location = relative(root, file).split(sep).join('/');
  const lines = (await readFile(file, 'utf8')).split('\n');

  lines.forEach((line, index) => {
    const at = `${location}:${index + 1}`;

    if (baseScalePattern.test(line)) {
      violations.push(`${at} 不能直接引用基础刻度：${line.trim()}`);
    }

    const propertyMatch = radiusPropertyPattern.exec(line);
    if (!propertyMatch) return;

    const value = propertyMatch[2].replace(/\/\*.*?\*\//g, '');
    for (const literal of value.matchAll(numericPattern)) {
      if (allowedLiterals.has(literal[0])) continue;
      violations.push(`${at} 圆角不得硬编码数值：${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error(`圆角 token 检查未通过，共 ${violations.length} 处：\n`);
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('');
  console.error('组件与业务样式只能引用 --app-radius-* 语义 token。');
  console.error(
    '数值定义见 src/styles/theme/radius.css，规范见 agent/docs/component-style.md 第六节。'
  );
  process.exit(1);
}

console.log(`圆角 token 检查通过，已扫描 ${files.length} 个样式文件。`);
