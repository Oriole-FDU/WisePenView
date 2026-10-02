/** 调用点：views/resource/ResourceRouteBoundary 与 CourseLearningLayout 组合；提供与业务解耦的「左侧内容 + 右侧对话面板」布局。 */
export { default as ChatDockLayout } from './ChatDockLayout';
export { chatDockActions } from './chatDockModel';
export { useChatDockState } from './controllers/useChatDockState';
export type { ChatDockLayoutProps } from './index.type';
