import {
  buildResourceOpenState,
  createResourceChatProviderKey,
  type ResourceChatStateProvider,
  type ResourceClientToolCall,
  type ResourceClientToolOutput,
  type ResourceOpenChatState,
} from '@/components/ChatPanel/ResourceChatProtocol';
import type { ChatClientToolCapability } from '@/domains/Chat';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { RESOURCE_KIND, RESOURCE_VIEWER } from '@/utils/navigation/resourceTarget';
import { validateDrawioXml } from './drawioProtocol';

export const DRAWIO_EDIT_XML_TOOL_NAME = 'edit_drawio_xml';
export const DRAWIO_READ_XML_TOOL_NAME = 'read_drawio_xml';

const DRAWIO_EDIT_XML_CAPABILITY: ChatClientToolCapability = {
  name: DRAWIO_EDIT_XML_TOOL_NAME,
  description:
    '完整替换当前打开的 Draw.io 文件 XML。仅在当前页面打开 Draw.io 文件且具备编辑权限时可用。',
  inputSchema: {
    type: 'object',
    properties: {
      xml: {
        type: 'string',
        description:
          '用于完整替换当前 Draw.io 图表内容的 XML，根节点必须是 mxfile 或 mxGraphModel。',
      },
    },
    required: ['xml'],
    additionalProperties: false,
  },
};

const DRAWIO_READ_XML_CAPABILITY: ChatClientToolCapability = {
  name: DRAWIO_READ_XML_TOOL_NAME,
  description:
    '读取当前页面打开的 Draw.io 文件 XML。仅在当前页面打开 Draw.io 文件且编辑器加载完成时可用。',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
};

function createDrawioChatResource(resourceId: string) {
  return {
    resourceId,
    resourceType: RESOURCE_KIND.DRAWIO,
    viewer: RESOURCE_VIEWER.DRAWIO,
  } as const;
}

function readInputRecord(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function readXmlInput(input: unknown): string {
  const xml = readInputRecord(input)?.xml;
  if (typeof xml !== 'string') {
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
      reason: 'edit_drawio_xml 的参数 xml 必须是字符串。',
    });
  }
  return xml;
}

export function createDrawioChatStateProvider(params: {
  resourceId: string;
  canEdit: boolean;
  editorLoaded: boolean;
  readXml: () => Promise<string>;
  replaceXml: (xml: string) => Promise<void>;
}): ResourceChatStateProvider<ResourceOpenChatState> {
  const resource = createDrawioChatResource(params.resourceId);
  const allowToolNames = params.canEdit
    ? [DRAWIO_EDIT_XML_TOOL_NAME, DRAWIO_READ_XML_TOOL_NAME]
    : [DRAWIO_READ_XML_TOOL_NAME];
  const clientToolCapabilities = params.canEdit
    ? [DRAWIO_EDIT_XML_CAPABILITY, DRAWIO_READ_XML_CAPABILITY]
    : [DRAWIO_READ_XML_CAPABILITY];

  // edit_drawio_xml执行逻辑
  const handleEditDrawioXml = async ({
    input,
  }: ResourceClientToolCall): Promise<ResourceClientToolOutput> => {
    if (!params.canEdit) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
        reason: '当前 Draw.io 文件没有编辑权限。',
      });
    }
    if (!params.editorLoaded) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
        reason: 'Draw.io 编辑器尚未加载完成。',
      });
    }

    const xml = readXmlInput(input);
    const validation = validateDrawioXml(xml);
    if (!validation.ok) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
        reason: `Draw.io XML 校验失败：${validation.message}`,
      });
    }

    await params.replaceXml(xml);
    return {
      ok: true,
      message: '已完整替换当前 Draw.io 文件 XML。',
      resource_id: params.resourceId,
    };
  };

  // read_drawio_xml执行逻辑
  const handleReadDrawioXml = async (): Promise<ResourceClientToolOutput> => {
    if (!params.editorLoaded) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
        reason: 'Draw.io 编辑器尚未加载完成。',
      });
    }

    const xml = await params.readXml();
    return {
      ok: true,
      xml,
      resource_id: params.resourceId,
    };
  };

  return {
    key: createResourceChatProviderKey(resource),
    getBlockedReason: () => {
      if (!params.editorLoaded) return 'Draw.io 编辑器尚未加载完成。';
      return undefined;
    },
    getStates: () => [buildResourceOpenState(resource)],
    allowToolNames,
    clientToolCapabilities,
    clientToolHandlers: {
      [DRAWIO_EDIT_XML_TOOL_NAME]: handleEditDrawioXml,
      [DRAWIO_READ_XML_TOOL_NAME]: handleReadDrawioXml,
    },
  };
}
