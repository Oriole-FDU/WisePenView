import type { AccessControlScope, ResourceAction } from '@/domains/_shared/access';
import type { ResourceIconType } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';

export type DriveSystemFolderType = 'trash' | 'shared' | 'note' | 'page';

export type DriveNodeScope =
  | {
      type: 'personal';
      rootId: string;
    }
  | {
      type: 'group';
      rootId: string;
      groupId: string;
    };

export interface DriveResourceLocation {
  scope: DriveNodeScope;
  mountTagId: string;
}

interface DriveNodeBase {
  /** 此处 id 由 service 分配，用于在 service 中查找节点 */
  id: string;
  parentId: string | null;
  /** 节点所属的 Drive 根作用域，用于并列展示个人盘和多个小组盘。 */
  scope: DriveNodeScope;
}

interface RootNode extends DriveNodeBase {
  type: 'root';
  name: string;
  /** 个人云盘有真实 root tag；小组 root 是虚拟容器，没有 tagId。 */
  tagId?: string;
  /** 只有带真实 tagId 的个人 root 允许直接挂载资源。 */
  canMountResources: boolean;
}

interface FolderNode extends DriveNodeBase {
  type: 'folder';
  tagId: string;
  /** 标签树中该节点的祖先 ID，供批量选择去重与防环校验。 */
  ancestorTagIds: string[];
  name: string;
  /** 标签树返回的文件夹创建者标识。 */
  tagCreator?: string;
  /** 标签树返回的文件夹创建者展示信息。 */
  creatorInfo?: UserDisplayBase;
  /** 系统目录由 Drive 渲染特殊名称，并禁止前端重命名、移动或删除。 */
  systemType?: DriveSystemFolderType;
  description?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  tagMountPermissionScope?: AccessControlScope;
  grantedActions?: ResourceAction[];
}

interface DriveResourceNodeBase extends DriveNodeBase {
  parentId: string;
  resourceId: string;
  title: string;
  resourceType?: string;
  resourceIconType: ResourceIconType;
  size?: number;
  description?: string;
  ownerId?: string;
  ownerInfo?: UserDisplayBase;
  currentActions?: ResourceAction[] | null;
  /** 当前节点所在目录 tag，用来描述资源是主挂载还是辅助挂载。 */
  mountTagId: string;
}

interface ResourceNode extends DriveResourceNodeBase {
  type: 'resource';
}

interface LinkNode extends DriveResourceNodeBase {
  type: 'link';
  scope: Extract<DriveNodeScope, { type: 'group' }>;
  /** 资源主挂载 tag；后端未返回有序 tag 时允许为空 */
  primaryTagId?: string;
}

export type DriveNode = RootNode | FolderNode | ResourceNode | LinkNode;
export type DriveContainerNode = RootNode | FolderNode;
export type DriveMutableNode = FolderNode | ResourceNode | LinkNode;
export type DriveResourceNode = ResourceNode | LinkNode;
export type { FolderNode, LinkNode, ResourceNode, RootNode };
