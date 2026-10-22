/**
 * z-index 层级守卫。
 *
 * 组件与业务样式只能引用应用语义层级（`--app-z-index-*`）：
 * 1. 禁止直接引用基础刻度（`--z-index-base` 到 `--z-index-1100`），它们只是顺序轴上的位置，不表达业务含义；
 * 2. `z-index` 的值只允许 `auto` 或 `var(--app-z-index-*)`，不得写回退数值；`calc(var(--app-z-index-*) + 1)`
 *    这类同域相邻插层允许保留偏移数字，因为顺序本身就是相对量；
 * 3. 内联样式（`*.ts` / `*.tsx`）的 `zIndex` 不得写数字字面量，否则会绕开样式文件的检查。
 *
 * `src/styles/**` 是 token 定义与基础设施层，不在检查范围内。
 * 语义缺失时先在 `src/styles/theme/z-index.css` 的应用语义层补 token，规则见 `agent/docs/component-style.md` 第七节。
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');
/** 基础设施与 token 层：基础刻度在此定义，允许直接引用。 */
const infraDir = join(srcDir, 'styles');
const styleExtensions = new Set(['.less', '.scss', '.css']);
const scriptExtensions = new Set(['.ts', '.tsx']);

/** 样式里的 `z-index` 声明，值允许跨行，直到 `;` 或规则结束。 */
const zIndexDeclarationPattern = /(?:^|[\s;{])z-index\s*:\s*([^;}]+)/gi;
/** 内联样式里的 `zIndex` 字段。 */
const inlineZIndexPattern = /\bzIndex\s*:\s*([^,}\n]+)/g;
/** 注释：匹配后替换成等长空白，保证行号与偏移不变。 */
const commentPattern = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
/** 单个 var() 引用，用于取出变量名并判断是否写了回退值。 */
const varReferencePattern = /var\(\s*(--[\w-]+)\s*(,)?/g;
/** 完整 var() 调用，用于剔除引用后检查残留数字。 */
const varCallPattern = /var\([^()]*\)/g;
/** 纯数字字面量，允许带 px 单位或引号，例如 5、'5'、5px。 */
const numericLiteralPattern = /^['"`]?\d+(?:\.\d+)?(?:px)?['"`]?$/;

async function collectFiles(dir, files) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (fullPath === infraDir) continue;
      await collectFiles(fullPath, files);
      continue;
    }

    const extension = extname(entry.name);
    if (styleExtensions.has(extension) || scriptExtensions.has(extension)) files.push(fullPath);
  }

  return files;
}

/**
 * 校验一个层级值。
 *
 * @param {string} rawValue 声明或字段的值，允许带注释。
 * @param {boolean} fromInline 值是否来自内联样式。
 * @returns {string[]} 违规原因，空数组表示通过。
 */
function collectReasons(rawValue, fromInline) {
  const value = rawValue.trim();

  if (!value) return [];

  // 内联样式只拦数字字面量：动态计算与 token 字符串同样是合法写法。
  if (fromInline) {
    return numericLiteralPattern.test(value) ? ['内联 zIndex 不得写数字字面量'] : [];
  }

  if (value === 'auto') return [];

  const reasons = [];
  let referencesAppToken = false;

  for (const [, name, hasFallback] of value.matchAll(varReferencePattern)) {
    if (/^--app-z-index-/.test(name)) {
      referencesAppToken = true;
      if (hasFallback) {
        reasons.push('层级 token 不得再写回退数值，数值只在 theme/z-index.css 维护一处');
      }
      continue;
    }

    reasons.push(
      /^--z-index-/.test(name)
        ? '不能直接引用基础刻度'
        : `只能引用 --app-z-index-*，不能引用 ${name}`
    );
  }

  if (!referencesAppToken) {
    reasons.push('z-index 必须引用 --app-z-index-* 语义 token');
  } else if (/(?<![\w-])\d/.test(value.replace(varCallPattern, '')) && !/\bcalc\(/.test(value)) {
    reasons.push('除 calc() 偏移外，z-index 不得出现数字');
  }

  return reasons;
}

/** 把匹配位置换算成行号。 */
function toLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

/** 把声明压成单行摘要，便于在终端里阅读。 */
function toSummary(value) {
  const summary = value.replace(/\s+/g, ' ').trim();
  return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
}

const violations = [];
const files = await collectFiles(srcDir, []);
let styleFileCount = 0;

for (const file of files) {
  const location = relative(root, file).split(sep).join('/');
  const isScript = scriptExtensions.has(extname(file));
  if (!isScript) styleFileCount += 1;

  const raw = await readFile(file, 'utf8');
  // 注释按等长空白替换：注释掉的声明不参与检查，但行号保持不变。
  const content = raw.replace(commentPattern, (comment) => comment.replace(/[^\n]/g, ' '));
  const pattern = isScript ? inlineZIndexPattern : zIndexDeclarationPattern;

  for (const match of content.matchAll(pattern)) {
    const reasons = collectReasons(match[1], isScript);
    if (reasons.length === 0) continue;

    const line = toLineNumber(content, match.index);
    violations.push(`${location}:${line} ${reasons.join('；')}：${toSummary(match[0])}`);
  }
}

if (violations.length > 0) {
  console.error(`z-index 层级检查未通过，共 ${violations.length} 处：\n`);
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('');
  console.error('组件与业务样式只能引用 --app-z-index-* 语义 token。');
  console.error(
    '数值定义见 src/styles/theme/z-index.css，规范见 agent/docs/component-style.md 第七节。'
  );
  process.exit(1);
}

console.log(
  `z-index 层级检查通过，已扫描 ${styleFileCount} 个样式文件和 ${files.length - styleFileCount} 个脚本文件。`
);
