export interface UserInviteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前用户自己的邀请码；为空时按钮禁用并提示稍后重试 */
  inviteCode?: string;
}
