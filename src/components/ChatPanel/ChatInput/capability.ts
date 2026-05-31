export interface CapabilityToolOption {
  toolId: string;
  label: string;
}

export const CHAT_V4_TOOL_OPTIONS: CapabilityToolOption[] = [
  { toolId: 'tool-web-search', label: '联网搜索' },
  { toolId: 'tool-image-generate', label: '生成图片' },
];
