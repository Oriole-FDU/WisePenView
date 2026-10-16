import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findReusableNote,hasNoteContent } from '../src/layouts/Resource/localNoteModel.ts';

test('空白段落、嵌套空白及格式不算有效内容', () => {
  assert.equal(
    hasNoteContent([
      {
        id: 'a',
        type: 'paragraph',
        props: { color: 'red' },
        content: [{ type: 'text', text: ' \r\n' }],
        children: [],
      },
    ]),
    false
  );
});
test('文字、链接、表格、图片附件和公式均受保护', () => {
  for (const value of [
    { content: [{ text: '。' }] },
    { content: [{ type: 'link', content: [{ text: 'x' }] }] },
    { content: { rows: [{ cells: [[{ text: '1' }]] }] } },
    { type: 'image' },
    { type: 'file' },
    { type: 'inlineMath' },
  ])
    assert.equal(hasNoteContent(value), true);
});
test('复用最新空笔记，保护自定义名称、标题、正文和非候选', () => {
  const base = {
    resourceId: 'old',
    name: '未命名笔记',
    defaultName: '未命名笔记',
    createdAt: 1,
    hasBody: false,
    hasTitle: false,
    eligible: true,
  };
  const newer = { ...base, resourceId: 'new', createdAt: 2 };
  assert.equal(findReusableNote([base, newer])?.resourceId, 'new');
  for (const patch of [
    { name: '已命名' },
    { hasBody: true },
    { hasTitle: true },
    { eligible: false },
  ])
    assert.equal(findReusableNote([{ ...base, ...patch }]), undefined);
  assert.equal(
    findReusableNote([
      { ...base, hasBody: true },
      { ...newer, hasBody: false },
    ])?.resourceId,
    'new'
  );
});
