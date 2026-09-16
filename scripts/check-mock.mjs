import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// 離線走正式 registry，確認 mock 只替換 I/O，跨 service 讀寫仍保持一致。
const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'check-mock-'));

try {
  const outfile = join(tempDir, 'registry.mjs');
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { getContextValue } from '@/domains/_registry/registry';
        export { clearAllServiceCaches } from '@/domains/_shared/cacheRegistry';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    metafile: true,
    alias: {
      '@': join(root, 'src'),
      '@domain-apis': join(root, 'src/domains/_registry/apis.mock.ts'),
    },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'mock', DEV: true, PROD: false }) },
  });
  assert(!Object.keys(result.metafile.inputs).some((path) => /\/apis\/\w*Api\.ts$/.test(path)));

  const storage = new Map();
  globalThis.localStorage = globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.fetch = () => assert.fail('Mock service 不應發出網路請求');
  globalThis.XMLHttpRequest = globalThis.WebSocket = class {
    constructor() {
      assert.fail('Mock service 不應開啟外部連線');
    }
  };
  const { getContextValue, clearAllServiceCaches } = await import(pathToFileURL(outfile).href);
  const {
    courseService: course,
    driveService: drive,
    tagService: tag,
    resourceService: resource,
    noteService: note,
    documentService: document,
    resourcePermissionService: permission,
    interactService: interact,
    chatService: chat,
    skillService: skill,
    agentService: agent,
    userService: user,
    walletService: wallet,
    groupService: group,
    inlineCommentService: inline,
  } = getContextValue();

  const courses = await course.listMyCourses({ page: 1, size: 20 });
  assert(courses.list.length >= 3);
  for (const item of courses.list) {
    await course.getCourseDetail(item.courseId);
    await course.getCourseOutline(item.courseId);
  }
  const courseId = await course.createCourse({ name: '離線驗證', description: '', term: '2026' });
  const first = await course.createCourseOutlineSection({ courseId, name: '第一節' });
  const second = await course.createCourseOutlineSection({ courseId, name: '第二節' });
  await course.renameCourseOutlineSection({ courseId, nodeId: first, name: '新名稱' });
  await course.reorderCourseOutlineSections({ courseId, orderedNodeIds: [second, first] });
  assert.deepEqual(
    (await course.getCourseOutline(courseId)).nodes.map((n) => n.nodeId),
    [second, first]
  );
  const created = await note.createNote({ title: '共用筆記' });
  const resourceId = created.resourceId;
  assert(resourceId);
  await course.mountCourseOutlineResources({
    courseId,
    targetNodeId: first,
    resourceIds: [resourceId],
  });
  assert.equal((await course.loadCourseOutlineResources({ courseId, nodeId: first })).total, 1);
  await course.setResourceRead({ resourceId });
  await course.moveCourseOutlineResource({
    courseId,
    resourceId,
    sourceNodeId: first,
    targetNodeId: second,
  });
  assert.equal((await course.loadCourseOutlineResources({ courseId, nodeId: first })).total, 0);
  assert.equal((await course.loadCourseOutlineResources({ courseId, nodeId: second })).total, 1);
  await course.removeCourseOutlineResource({
    courseId,
    resourceId,
    sourceNodeId: second,
    mainTagId: second,
    currentTagIds: [second],
  });
  assert.equal((await course.loadCourseOutlineResources({ courseId, nodeId: second })).total, 0);

  const driveRoot = await drive.getRoot();
  const folder = await drive.createFolder({ parent: driveRoot, name: '驗證資料夾' });
  await drive.setPersonalResourcesLocation({ resourceIds: [resourceId], target: folder });
  assert.equal((await drive.loadNodeChildren({ parent: folder })).resourceTotal, 1);
  assert(!(await tag.getTagTree()).some((item) => item.tagName.startsWith('/')));
  const collectionId = await interact.createFavoriteCollection({ collectionName: '驗證收藏' });
  await interact.updateFavoriteCollections({ resourceId, collectionIds: [collectionId] });
  await resource.renameResource({ resourceId, newName: '新筆記名稱' });
  const favorites = await interact.listFavoritedResources({ collectionId, page: 1, size: 20 });
  assert.equal(favorites.list[0].resourceInfo.resourceName, '新筆記名稱');
  assert.equal((await note.getNoteInfoDisplay({ resourceId })).noteTitle, '新筆記名稱');
  const search = await resource.globalSearch({ keyword: '算法', scope: 'ALL', page: 1, size: 50 });
  assert(search.list.length > 0);
  for (const hit of search.list) {
    const type = hit.resourceType === 'note' ? 'note' : 'file';
    await permission.getResourcePermissionOverview({
      resourceId: hit.resourceId,
      resourceType: type,
    });
  }

  const overview = await permission.getResourcePermissionOverview({
    resourceId: 'res-001',
    resourceType: 'file',
  });
  assert.deepEqual(
    new Set(overview.subjects.map((s) => s.source)),
    new Set(['owner', 'tag', 'resourceOverride', 'specifiedUser'])
  );
  await resource.updateResourceActionPermission({
    resourceId: 'res-001',
    specifiedUsersGrantedActions: null,
    overrideGrantedActions: null,
  });
  const cleared = await permission.getResourcePermissionOverview({
    resourceId: 'res-001',
    resourceType: 'file',
  });
  assert(cleared.subjects.every((s) => s.source === 'tag' || s.source === 'owner'));

  const sessions = await chat.listSessions({ page: 1, size: 2 });
  const history = await chat.listHistoryMessages({
    sessionId: sessions.list[0].id,
    page: 1,
    size: 20,
  });
  assert.equal(history.list.length, 20);
  assert(history.total > history.list.length);
  const session = await chat.createSession({ title: '離線對話' });
  assert.equal(
    (await chat.renameSession({ sessionId: session.id, newTitle: '重新命名' })).title,
    '重新命名'
  );
  assert(
    (await chat.listChatInputSkills({ scope: 'PERSONAL', page: 1, size: 20 })).list.length > 0
  );
  await chat.getChatInputCapabilityOptions({ agent: null });
  await chat.deleteSession({ sessionId: session.id });

  const skillId = await skill.createSkill('驗證 Skill');
  const { draftVersion } = await skill.getSkillDetail(skillId);
  const [uploaded] = await skill.uploadAssets(skillId, draftVersion, [
    { name: 'check.md', path: '/', content: '共享上傳流程' },
  ]);
  assert(!uploaded.error);
  assert.equal(
    await skill.loadAssetContent(skillId, uploaded.objectKey, draftVersion),
    '共享上傳流程'
  );
  const [moved] = await skill.moveAssets(skillId, draftVersion, [
    { ...uploaded, name: 'moved.md', path: '/' },
  ]);
  assert.equal(
    await skill.loadAssetContent(skillId, moved.objectKey, draftVersion),
    '共享上傳流程'
  );
  await skill.publishVersion(skillId);
  assert.equal((await skill.getSkillDetail(skillId)).version, 1);
  await skill.deleteAssets(skillId, draftVersion + 1, [moved.assetId]);
  const agentId = await agent.createAgent('驗證 Agent');
  const detail = await agent.getAgentDetail(agentId);
  await agent.saveAgentDraft({
    resourceId: agentId,
    draftVersion: detail.draftVersion,
    spec: { ...detail.spec, systemPrompt: '驗證提示詞' },
  });
  await agent.publishVersion(agentId);
  assert.equal((await agent.getAgentDetail(agentId, 1)).spec.systemPrompt, '驗證提示詞');

  const inlineCommentId = await inline.createInlineComment({
    resourceId,
    externalAnchorId: 'anchor',
    content: '驗證批註',
  });
  const [thread] = await inline.listInlineComments({ resourceId });
  const itemId = thread.items[0].itemId;
  await inline.setInlineCommentItemReaction({
    resourceId,
    inlineCommentId,
    itemId,
    emojiId: 'thumbsup',
  });
  await inline.changeInlineCommentResolveStatus({ resourceId, inlineCommentId, resolved: true });
  assert.equal((await inline.listInlineComments({ resourceId, resolved: true })).length, 1);
  await inline.deleteInlineCommentItem({ resourceId, inlineCommentId, itemId });
  assert.equal((await inline.listInlineComments({ resourceId })).length, 0);
  await user.getUserInfo();
  await user.updateUserInfo({ nickname: '更新後的使用者' });
  clearAllServiceCaches();
  assert.equal((await user.getUserInfo()).nickname, '更新後的使用者');
  const candidates = await user.queryUserSearchCandidates({ keyword: 'xiaoming' });
  assert.equal(candidates.length, 1);
  assert(
    (await wallet.listMergedTransactions({ typeA: 1, typeB: 2, page: 1, size: 20 })).records
      .length > 0
  );
  const groupBalance = await group.getGroupWalletInfo({ groupId: '1' });
  const userBalance = (await wallet.getUserWalletInfo()).balance;
  await wallet.transferTokenBetweenGroupAndUser({
    groupId: '1',
    tokenCount: 100,
    tokenTransferType: 1,
  });
  assert.equal(await group.getGroupWalletInfo({ groupId: '1' }), groupBalance + 100);
  assert.equal((await wallet.getUserWalletInfo()).balance, userBalance - 100);
  await assert.rejects(document.uploadDocument({ file: new File(['x'], 'invalid.exe') }));
  await assert.rejects(course.listCourseAssignments(courseId));
  await course.deleteCourse(courseId);
  await assert.rejects(course.getCourseDetail(courseId));
  console.log('Mock 共用 service 離線檢查通過');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
