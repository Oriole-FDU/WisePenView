import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundled = await build({
  entryPoints: ['src/components/business/Drive/common/buildDriveTreeData.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { buildDriveTreeData } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
);
const driveBundled = await build({
  absWorkingDir: root,
  stdin: {
    contents: `
      export {
        buildDriveNodeScope,
        mapTagToFolderNode,
        orderDriveFolderNodes,
      } from '@/domains/Drive/model/driveNode';
      export { createDriveServices } from '@/domains/Drive/service/DriveServices.impl';
    `,
    resolveDir: root,
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': join(root, 'src') },
});
const driveModule = await import(
  `data:text/javascript;base64,${Buffer.from(driveBundled.outputFiles[0].contents).toString('base64')}`
);

test('选文件时目录不可选但可展开，显式禁用的目录仍不可操作', () => {
  const nodes = [
    { id: 'root', type: 'root' },
    { id: 'folder', type: 'folder' },
    { id: 'file', type: 'resource' },
    { id: 'link', type: 'link' },
    { id: 'filtered', type: 'resource' },
    { id: 'blocked', type: 'folder' },
    { id: 'restricted', type: 'folder' },
  ];
  const tree = buildDriveTreeData(
    nodes,
    {
      renderableTypes: new Set(['root', 'folder', 'resource', 'link']),
      selectableTypes: new Set(['resource', 'link']),
      disabledNodeIds: new Set(['blocked']),
      isNodeSelectable: (node) => node.id !== 'filtered',
      isNodeDisabled: (node) => node.id === 'restricted',
      getTreeKey: (node) => node.id,
      renderTitle: (node) => node.id,
    },
    new Map()
  );
  assert.deepEqual(
    tree.map(({ key, disabled, selectable }) => ({ key, disabled, selectable })),
    [
      { key: 'root', disabled: false, selectable: false },
      { key: 'folder', disabled: false, selectable: false },
      { key: 'file', disabled: false, selectable: true },
      { key: 'link', disabled: false, selectable: true },
      { key: 'filtered', disabled: true, selectable: false },
      { key: 'blocked', disabled: true, selectable: false },
      { key: 'restricted', disabled: true, selectable: false },
    ]
  );
});

test('.Note、.Page 映射为系统目录，并按 .Shared、.Note、.Page、普通目录排序', () => {
  const scope = driveModule.buildDriveNodeScope();
  const mapFolder = (tagId, tagName) =>
    driveModule.mapTagToFolderNode(
      { tagId, tagName, parentId: '', children: [] },
      scope.rootId,
      scope
    );
  const shared = mapFolder('shared', '.Shared');
  const note = mapFolder('note', '.Note');
  const page = mapFolder('page', '.Page');
  const normal = mapFolder('normal', '工作');

  assert.equal(note.systemType, 'note');
  assert.equal(page.systemType, 'page');
  assert.deepEqual(
    driveModule.orderDriveFolderNodes([normal, page, note, shared]).map((node) => node.tagId),
    ['shared', 'note', 'page', 'normal']
  );
});

test('个人云盘根目录展示 .Shared、.Note、.Page，同时隐藏 .Trash 与其他点号目录', async () => {
  const rootTag = {
    tagId: 'root',
    tagName: '/',
    parentId: '0',
    children: [{ tagId: 'work', tagName: '工作', parentId: '', children: [] }],
  };
  const roots = [
    rootTag,
    { tagId: 'trash', tagName: '.Trash', parentId: '0', children: [] },
    { tagId: 'note', tagName: '.Note', parentId: '0', children: [] },
    { tagId: 'shared', tagName: '.Shared', parentId: '0', children: [] },
    { tagId: 'page', tagName: '.Page', parentId: '0', children: [] },
    { tagId: 'hidden', tagName: '.Hidden', parentId: '0', children: [] },
  ];
  const tagById = new Map(roots.map((tag) => [tag.tagId, tag]));
  const tagService = {
    getRawTagTree: async () => roots,
    getRawTagById: (tagId) => tagById.get(tagId),
  };
  const driveService = driveModule.createDriveServices({
    tagService,
    resourceService: {},
  });
  const rootNode = await driveService.getRoot();
  const page = await driveService.loadNodeChildren({
    parent: rootNode,
    kinds: ['folder'],
  });

  assert.deepEqual(
    page.folderNodes.map((node) => ({ tagId: node.tagId, systemType: node.systemType })),
    [
      { tagId: 'shared', systemType: 'shared' },
      { tagId: 'note', systemType: 'note' },
      { tagId: 'page', systemType: 'page' },
      { tagId: 'work', systemType: undefined },
    ]
  );
});
