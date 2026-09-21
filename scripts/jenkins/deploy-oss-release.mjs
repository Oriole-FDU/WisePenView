import { readFile } from 'node:fs/promises';
import path from 'node:path';

import OSS from 'ali-oss';

// 发布元数据和业务静态文件放在同一个 bucket 根目录下
// 元数据目录必须受到保护：它不属于 dist，也不能被旧文件清理逻辑删除
const DEPLOY_META_PREFIX = '.wisepen-deploy';
const CURRENT_MANIFEST_KEY = `${DEPLOY_META_PREFIX}/current.json`;
const PREVIOUS_MANIFEST_KEY = `${DEPLOY_META_PREFIX}/previous.json`;
const KNOWN_FILES_KEY = `${DEPLOY_META_PREFIX}/known-files.json`;

// 所有关键配置都从 Jenkins 环境变量读取
// 不提供默认值，避免 endpoint、bucket 或凭据为空时把操作误发到错误目标
function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
}

// ali-oss 接受不带协议的 endpoint；同时去掉末尾斜杠
// 避免不同 Jenkins 参数写法导致 SDK 拼接 URL 时出现双斜杠
function normalizeEndpoint(endpoint) {
  return endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// dist 中的路径最终会直接成为 OSS 根目录对象名
// 禁止绝对路径、父目录穿越和 Windows 反斜杠，避免清理或上传越界对象
function assertObjectName(name) {
  if (!name || name.startsWith('/') || name.includes('..') || name.includes('\\')) {
    throw new Error(`非法 OSS 对象路径：${name}`);
  }
  if (name.startsWith(`${DEPLOY_META_PREFIX}/`)) {
    throw new Error(`dist 文件不能写入发布元数据目录：${name}`);
  }
}

// index.html 必须尽快拿到最新入口，但不能被浏览器长期缓存
// 带 hash 的 assets 可以长期缓存，其它固定文件使用较短缓存时间
function cacheControlFor(name) {
  if (name === 'index.html') {
    return 'no-cache, no-store, must-revalidate';
  }
  if (name.startsWith('assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

// current.json、previous.json 和 known-files.json 都是可选存在的历史状态
// OSS 对象不存在时返回 null，发布脚本将其视为首次接管或旧版本元数据缺失
async function getJsonObject(client, key) {
  try {
    const result = await client.get(key);
    return JSON.parse(result.content.toString('utf8'));
  } catch (error) {
    if (error?.code === 'NoSuchKey' || error?.status === 404) {
      return null;
    }
    throw error;
  }
}

// 将 manifest 的 files 数组转换为 Set，便于在清理阶段进行快速包含判断
function manifestFileSet(manifest) {
  return new Set(Array.isArray(manifest?.files) ? manifest.files : []);
}

// 优先使用 known-files.json，因为它记录了脚本历次已管理的对象集合
// 如果旧版本没有这个文件，则退回到 current/previous 两份 manifest，兼容首次升级
function knownFileSet(knownFiles, currentManifest, previousManifest) {
  if (Array.isArray(knownFiles?.files)) {
    return new Set(knownFiles.files);
  }
  return new Set([...manifestFileSet(currentManifest), ...manifestFileSet(previousManifest)]);
}

// 生成删除列表时只处理脚本知道并负责管理的对象
// keep-previous-release 会额外保留上一版资源，降低已打开页面懒加载旧 chunk 失败的概率
// delete-all-stale 只保留本次构建文件。两种策略都不会触碰 .wisepen-deploy 元数据目录
function buildDeleteList({ policy, knownFiles, nextManifest, oldCurrentManifest }) {
  const keepFiles = new Set(nextManifest.files);
  if (policy === 'keep-previous-release' && oldCurrentManifest) {
    for (const file of manifestFileSet(oldCurrentManifest)) {
      keepFiles.add(file);
    }
  } else if (policy !== 'delete-all-stale') {
    throw new Error(`不支持的 OSS_CLEAN_POLICY：${policy}`);
  }

  return [...knownFiles]
    .filter((file) => !keepFiles.has(file))
    .filter((file) => !file.startsWith(`${DEPLOY_META_PREFIX}/`))
    .sort();
}

// 元数据统一使用 no-cache，确保下一次 Jenkins 发布读取到的是最新状态
async function putJsonObject(client, key, value) {
  await client.put(key, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

// 首次接管时没有历史 manifest，脚本无法知道哪些对象曾由它管理
// 列出 bucket 根目录的现有对象作为候选旧文件；元数据目录和目录占位对象始终跳过
// 这一步只在没有 current.json 时执行，正常发布不会扫描整个 bucket
async function listRootObjects(client) {
  const objects = [];
  let continuationToken;

  do {
    const result = await client.listV2(
      {
        'max-keys': 1000,
        'continuation-token': continuationToken,
      },
      {}
    );
    for (const object of result.objects ?? []) {
      const name = object.name;
      if (!name || name.endsWith('/') || name.startsWith(`${DEPLOY_META_PREFIX}/`)) {
        continue;
      }
      objects.push(name);
    }
    continuationToken = result.nextContinuationToken;
  } while (continuationToken);

  return new Set(objects);
}

const endpoint = normalizeEndpoint(requireEnv('OSS_ENDPOINT'));
const bucket = requireEnv('OSS_BUCKET');
const cleanPolicy = requireEnv('OSS_CLEAN_POLICY');
const manifestPath = requireEnv('RELEASE_MANIFEST');
const distDir = 'dist';

const client = new OSS({
  accessKeyId: requireEnv('ALIYUN_ACCESS_KEY_ID'),
  accessKeySecret: requireEnv('ALIYUN_ACCESS_KEY_SECRET'),
  bucket,
  endpoint,
  secure: true,
});

// manifest 来自 Build 阶段
// 构建、归档、发布使用同一份清单，避免部署阶段漏文件或误删文件
const nextManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(nextManifest.files) || !nextManifest.files.includes('index.html')) {
  throw new Error(`发布清单无效：${manifestPath}`);
}

for (const file of nextManifest.files) {
  assertObjectName(file);
}

// oldCurrentManifest 存在时使用脚本维护的历史集合
const oldCurrentManifest = await getJsonObject(client, CURRENT_MANIFEST_KEY);
const oldPreviousManifest = await getJsonObject(client, PREVIOUS_MANIFEST_KEY);
const oldKnownFiles = await getJsonObject(client, KNOWN_FILES_KEY);
const knownFiles = oldCurrentManifest
  ? knownFileSet(oldKnownFiles, oldCurrentManifest, oldPreviousManifest)
  : await listRootObjects(client);

// index.html 最后上传
// 这样在新入口生效之前，所有带 hash 的新资源已经存在
// 避免用户拿到新入口却立即请求到尚未上传的 chunk
const uploadFiles = nextManifest.files.filter((file) => file !== 'index.html');
uploadFiles.push('index.html');

for (const file of uploadFiles) {
  await client.put(file, path.join(distDir, file), {
    headers: {
      'Cache-Control': cacheControlFor(file),
    },
  });
  console.log(`已上传：${file}`);
}

// 上传完成后计算并执行旧文件清理，避免整站不可用
const deleteList = buildDeleteList({
  policy: cleanPolicy,
  knownFiles,
  nextManifest,
  oldCurrentManifest,
});

for (const file of deleteList) {
  await client.delete(file);
  console.log(`已删除旧文件：${file}`);
}

// known-files.json 保存下一次发布需要考虑的对象集合
// 保留上一版时把当前版和上一版合并保存；强清理时只记录当前版
const nextKnownFiles = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  policy: cleanPolicy,
  files:
    cleanPolicy === 'keep-previous-release' && oldCurrentManifest
      ? [...new Set([...nextManifest.files, ...oldCurrentManifest.files])].sort()
      : [...nextManifest.files].sort(),
};

// 每个版本保留一份 manifest，方便审计某次 Jenkins 发布包含了哪些文件
await client.put(
  `${DEPLOY_META_PREFIX}/manifests/${nextManifest.release}.json`,
  Buffer.from(`${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8'),
  {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json; charset=utf-8',
    },
  }
);

// 当前版本文件和清理动作都完成后更新 current/previous 指针
// 中途上传或删除失败时，不会把未完成的发布标记成 current
if (oldCurrentManifest) {
  await putJsonObject(client, PREVIOUS_MANIFEST_KEY, oldCurrentManifest);
}
await putJsonObject(client, CURRENT_MANIFEST_KEY, nextManifest);
await putJsonObject(client, KNOWN_FILES_KEY, nextKnownFiles);

if (!oldCurrentManifest) {
  console.log(
    `未发现上一版 current.json，本次按首次接管处理：已上传并清理根目录旧文件 ${deleteList.length} 个。`
  );
} else {
  console.log(`OSS 发布完成：${nextManifest.release}，清理旧文件 ${deleteList.length} 个。`);
}
