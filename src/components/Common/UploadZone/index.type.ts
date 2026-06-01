export interface UploadZoneProps {
  file: File | null;
  disabled?: boolean;
  accept?: string;
  label?: string;
  description?: string;
  onFileChange: (file: File | null) => void;
}
