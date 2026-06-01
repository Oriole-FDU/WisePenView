import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button } from '@heroui/react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AiOutlineInbox } from 'react-icons/ai';
import type { UploadZoneProps } from './index.type';
import styles from './style.module.less';

function UploadZone({
  file,
  disabled = false,
  accept,
  label = '点击或拖拽文件到此区域',
  description = '仅可选择单个文件',
  onFileChange,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const selectFile = (files: FileList | null) => {
    if (disabled) return;
    const nextFile = files?.[0];
    if (nextFile) {
      onFileChange(nextFile);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        className={styles.nativeInput}
        type="file"
        accept={accept}
        onChange={handleInputChange}
      />
      {file ? (
        <div className={styles.selectedFile}>
          <div className={styles.fileInfo}>
            <span className={styles.fileName} title={file.name}>
              {file.name}
            </span>
            <span className={styles.fileMeta}>{formatFileSize(file.size)}</span>
          </div>
          <Button variant="ghost" size="sm" isDisabled={disabled} onPress={openFilePicker}>
            重新选择
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.dropArea}
          data-active={dragActive}
          disabled={disabled}
          onClick={openFilePicker}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <AiOutlineInbox className={styles.uploadIcon} size={44} />
          <span className={styles.uploadText}>{label}</span>
          <span className={styles.uploadHint}>{description}</span>
        </button>
      )}
    </>
  );
}

export default UploadZone;
