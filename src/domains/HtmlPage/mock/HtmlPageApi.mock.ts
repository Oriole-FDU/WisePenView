import { mockResponse } from '@/domains/_shared/mock/response';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { HtmlPageApi as HtmlPageApiContract } from '../apis/HtmlPageApi';

const MOCK_HTML = `<!doctype html>
<html lang="zh-CN">
  <head><title>AI HTML 页面</title></head>
  <body><h1>AI HTML 页面</h1><p>这是前端 mock 预览。</p></body>
</html>`;

const HTML_RESOURCE_ID = 'mock-html-page';

addMockResource('AI HTML 页面', 'SINGLE_HTML_PAGE', 'tag-page', HTML_RESOURCE_ID);
// HTML 页面只支持发现、查看和编辑，mock 与后端权限动作保持一致。
getMockResource(HTML_RESOURCE_ID).currentActions = ['DISCOVER', 'VIEW', 'EDIT'];

export const HtmlPageApi: typeof HtmlPageApiContract = {
  getSingleHtmlPageInfo: ({ resourceId }) =>
    mockResponse({
      resourceInfo: getMockResource(resourceId),
      currentVersion: 1,
      versionInfo: {
        singleHtmlPageId: 'mock-html-version-1',
        resourceId,
        version: 1,
        singleHtmlPageStatus: 'READY',
        size: MOCK_HTML.length.toString(),
        createTime: Date.parse('2026-10-23T00:00:00Z'),
        updateTime: Date.parse('2026-10-23T00:00:00Z'),
      },
    }),
  getSingleHtmlPageContent: () => mockResponse(MOCK_HTML),
};
