import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompactPaginationItems,
  buildExpandedPaginationItems,
  getTotalPages,
} from '../src/utils/pagination.ts';

test('总页数至少为一页，非整页向上取整', () => {
  assert.equal(getTotalPages(0, 10), 1);
  assert.equal(getTotalPages(20, 10), 2);
  assert.equal(getTotalPages(21, 10), 3);
});

test('公共列表维持紧凑页码及断档省略号', () => {
  assert.deepEqual(buildCompactPaginationItems(1, 1), [1]);
  assert.deepEqual(buildCompactPaginationItems(1, 2), [1, 2]);
  assert.deepEqual(buildCompactPaginationItems(1, 7), [1, 2, 'ellipsis', 7]);
  assert.deepEqual(buildCompactPaginationItems(2, 10), [1, 2, 3, 'ellipsis', 10]);
  assert.deepEqual(buildCompactPaginationItems(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  assert.deepEqual(buildCompactPaginationItems(9, 10), [1, 'ellipsis', 8, 9, 10]);
  assert.deepEqual(buildCompactPaginationItems(10, 10), [1, 'ellipsis', 9, 10]);
});

test('表格在七页以内显示全部，临近边界时扩展页码', () => {
  assert.deepEqual(buildExpandedPaginationItems(1, 1), [1]);
  assert.deepEqual(buildExpandedPaginationItems(1, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(buildExpandedPaginationItems(1, 8), [1, 2, 3, 4, 5, 'ellipsis', 8]);
  assert.deepEqual(buildExpandedPaginationItems(2, 10), [1, 2, 3, 4, 5, 'ellipsis', 10]);
  assert.deepEqual(buildExpandedPaginationItems(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  assert.deepEqual(buildExpandedPaginationItems(9, 10), [1, 'ellipsis', 6, 7, 8, 9, 10]);
  assert.deepEqual(buildExpandedPaginationItems(10, 10), [1, 'ellipsis', 6, 7, 8, 9, 10]);
});

test('表格自定义 sibling 和 boundary 数量不改变原有省略号规则', () => {
  assert.deepEqual(buildExpandedPaginationItems(10, 20, { siblingCount: 2, boundaryCount: 2 }), [
    1,
    2,
    'ellipsis',
    8,
    9,
    10,
    11,
    12,
    'ellipsis',
    19,
    20,
  ]);
  assert.deepEqual(buildExpandedPaginationItems(1, 10, { boundaryCount: 0 }), [
    1,
    2,
    3,
    4,
    5,
    'ellipsis',
  ]);
  assert.deepEqual(buildExpandedPaginationItems(10, 10, { boundaryCount: 0 }), [
    'ellipsis',
    6,
    7,
    8,
    9,
    10,
  ]);
});
