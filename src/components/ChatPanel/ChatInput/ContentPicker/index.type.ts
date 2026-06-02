export interface ContentPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectUpload: () => void;
  onSelectLibrary: () => void;
}
