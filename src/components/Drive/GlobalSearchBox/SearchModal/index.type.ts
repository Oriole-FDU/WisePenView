export interface SearchModalProps {
  /** 受控开关，由父 GlobalSearchBox 持有 */
  isOpen: boolean;
  /** Esc / 遮罩点击 / 命中点击成功均触发关闭 */
  onOpenChange: (open: boolean) => void;
}
