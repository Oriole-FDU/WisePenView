import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ChatHostAgentPort } from '@/components/business/ChatPanel/index.type';
import type {
  ResourceAction,
  ResourceIconType,
  ResourceItem,
  ResourcePermissionResourceType,
} from '@/domains/Resource';
import type { ResourceKind, ResourceViewer } from '@/domains/Resource/model/resourceTarget';

export type EditorKind = 'note' | 'pdf' | 'skill' | 'agent' | 'drawio' | 'office';
export interface EditorTarget {
  resourceId: string;
  resourceType: ResourceKind;
  viewer: ResourceViewer;
  resourceName?: string;
}
export interface EditorSnapshot {
  openedResource: EditorTarget & { version?: number | null };
  activeFile?: { id: string; path: string };
  loading: boolean;
  error?: unknown;
  readOnly: boolean;
  hasUnsavedChanges: boolean;
  pendingWork: boolean;
  warnBeforeUnload: boolean;
}
export type EditorExitReason = 'close' | 'switch-resource' | 'switch-viewer' | 'leave-page';
export type EditorExitChoice = 'cancel' | 'save' | 'discard';
export interface EditorExitPrompt {
  title: string;
  description: string;
  confirmText: string;
  discardText?: string;
  warning?: boolean;
}
export interface EditorExitContext {
  reason: EditorExitReason;
  signal: AbortSignal;
  confirm(prompt: EditorExitPrompt): Promise<EditorExitChoice>;
}
export interface Editor {
  readonly instanceId: string;
  readonly kind: EditorKind;
  getSnapshot(): EditorSnapshot;
  subscribe(listener: () => void): () => void;
  prepareExit(context: EditorExitContext): Promise<boolean>;
}

/** 编辑器提供领域信息与专属动作，宿主决定通用资源管理 UI 的装配。 */
export interface EditorResourcePresentation {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  resourceInfo?: ResourceItem;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  permissionResourceType: ResourcePermissionResourceType;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  isDisabled?: boolean;
  titleMeta?: ReactNode;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  moreMenu?: {
    advanced?: ReactNode;
    actions?: readonly { id: string; label: string; icon: LucideIcon; onAction(): void }[];
    onPrint?: () => void;
    printLabel?: string;
    printIcon?: LucideIcon;
    download?: { label: string; onAction(): void };
    isPending?: boolean;
    onSearch?: () => void;
    showInlineCommentHistory?: boolean;
    onInlineCommentHistory?: () => void;
  };
  hideBreadcrumb?: boolean;
}
export interface EditorChatProvider {
  key: string;
  getBlockedReason?: () => string | undefined;
  onDemandSkillIds?: readonly string[];
}
export interface EditorChatContext {
  providerKey: string;
}
export interface EditorPresentation {
  className?: string;
  header?: { resource?: EditorResourcePresentation } | false;
  sidePanel?: {
    resource: ResourceItem;
    inlineComment?: ReactNode;
    onResourceChanged?: () => unknown | Promise<unknown>;
  };
  chat?: { provider?: EditorChatProvider; hostAgentPort?: ChatHostAgentPort };
  document?: {
    resourceInfo?: ResourceItem;
    documentType?: string;
    onPermissionSuccess?: () => void;
    onResourceChanged?: () => unknown | Promise<unknown>;
  };
}
export interface EditorHostCapabilities {
  openChatPanel(): void;
  setChatContext(context: EditorChatContext): void;
  openInlineComments(resourceId: string): void;
  navigateResourceHash?: (hash: string) => void;
}
export interface EditorSurfaceProps {
  target: EditorTarget;
  instanceId: string;
  host: EditorHostCapabilities;
  onRegister(editor: Editor): () => void;
  renderWorkspace(presentation: EditorPresentation, body: ReactNode): ReactNode;
}
