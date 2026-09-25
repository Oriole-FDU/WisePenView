/** 调用点：ChatInput 装配，附件入口、模型与能力选择器消费；提供独立输入实例状态和附件上传能力，实例 store 由本目录维护。 */
export { ChatInputFileProvider } from './ChatInputFileProvider';
export { ChatInputStoreProvider } from './ChatInputStoreProvider';
export { useChatInputFiles } from './useChatInputFiles';
export { useChatInputStore, useChatInputStoreApi } from './useChatInputStore';
