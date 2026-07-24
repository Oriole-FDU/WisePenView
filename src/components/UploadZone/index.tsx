import EntryIcon from '@/components/Icons/EntryIcon';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, ProgressBar } from '@heroui/react';
import { UploadCloud, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import type { UploadZoneProps } from './index.type';
import styles from './style.module.less';

function UploadZone({
  file,
  files,
  multiple = false,
  disabled = false,
  accept,
  label = '点击或拖拽文件到此区域',
  description = '仅可选择单个文件',
  onFileChange,
  onFilesChange,
  getFileProgress,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const selectedFiles = files ?? (file ? [file] : []);

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const selectFile = (files: FileList | null) => {
    if (disabled) return;
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length > 0) {
      if (multiple) {
        onFilesChange?.(mergeFiles(selectedFiles, nextFiles));
      } else {
        onFileChange?.(nextFiles[0]);
      }
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openFilePicker();
  };

  const removeFile = () => {
    if (disabled) return;
    if (multiple) {
      onFilesChange?.([]);
      return;
    }
    onFileChange?.(null);
  };

  const removeFileAt = (index: number) => {
    if (disabled) return;
    if (multiple) {
      onFilesChange?.(selectedFiles.filter((_, fileIndex) => fileIndex !== index));
      return;
    }
    onFileChange?.(null);
  };

  return (
    <div className={styles.dropZone}>
      <input
        ref={inputRef}
        className={styles.nativeInput}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={styles.dropArea}
        data-active={dragActive}
        data-disabled={disabled}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.uploadIcon} aria-hidden="true">
          <UploadCloud size={32} strokeWidth={1.8} />
        </span>
        <span className={styles.uploadText}>{label}</span>
        <span className={styles.uploadHint}>{description}</span>
        <Button variant="outline" size="sm" isDisabled={disabled} onPress={openFilePicker}>
          {multiple ? '选择文件' : selectedFiles.length > 0 ? '重新选择' : '选择文件'}
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <AttachmentGroup className={styles.fileList} role="group" aria-label="已选择文件">
          {selectedFiles.map((selectedFile, index) => {
            const fileProgress = getFileProgress?.(selectedFile, index);
            const attachmentState =
              typeof fileProgress === 'number' && fileProgress < 100 ? 'uploading' : 'done';

            return (
              <Attachment
                className={styles.fileAttachment}
                state={attachmentState}
                size="sm"
                key={getFileKey(selectedFile)}
              >
                <AttachmentMedia>
                  <EntryIcon entryType="resource" size={18} />
                </AttachmentMedia>
                <AttachmentContent className={styles.fileInfo}>
                  <div className={styles.fileTextRow}>
                    <AttachmentTitle className={styles.fileName} title={selectedFile.name}>
                      {selectedFile.name}
                    </AttachmentTitle>
                    <AttachmentDescription className={styles.fileMeta}>
                      {formatFileSize(selectedFile.size)}
                    </AttachmentDescription>
                  </div>
                  {typeof fileProgress === 'number' && (
                    <div className={styles.fileProgress}>
                      <ProgressBar
                        aria-label={`${selectedFile.name} 上传进度`}
                        value={fileProgress}
                        size="sm"
                      >
                        <ProgressBar.Track className={styles.fileProgressTrack}>
                          <ProgressBar.Fill className={styles.fileProgressFill} />
                        </ProgressBar.Track>
                      </ProgressBar>
                    </div>
                  )}
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    isDisabled={disabled}
                    label="移除文件"
                    onPress={() => removeFileAt(index)}
                  >
                    <X size={16} strokeWidth={1.8} />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            );
          })}
          {multiple && selectedFiles.length > 1 && (
            <div className={styles.fileListActions}>
              <Button variant="ghost" size="sm" isDisabled={disabled} onPress={removeFile}>
                清空全部
              </Button>
            </div>
          )}
        </AttachmentGroup>
      )}
    </div>
  );
}

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(currentFiles: File[], nextFiles: File[]): File[] {
  const fileMap = new Map(currentFiles.map((file) => [getFileKey(file), file]));
  nextFiles.forEach((file) => {
    fileMap.set(getFileKey(file), file);
  });
  return Array.from(fileMap.values());
}

export default UploadZone;
