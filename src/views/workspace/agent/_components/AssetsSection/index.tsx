import AppIconButton from '@/components/Button/AppIconButton';
import type { AgentAsset } from '@/domains/Agent';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, Table } from '@heroui/react';
import { Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import SectionShell from '../SectionShell';
import styles from './style.module.less';
interface Props {
  assets: AgentAsset[];
  disabled: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
}
const isFileDrag = (event: DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer.types).includes('Files');

export default function AssetsSection({ assets, disabled, uploading, onUpload, onDelete }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadDisabled = disabled || uploading;

  const resetDragState = () => {
    dragCounterRef.current = 0;
    setIsDragOver(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (uploadDisabled) return;

    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = uploadDisabled ? 'none' : 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (uploadDisabled) return;

    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) resetDragState();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    resetDragState();
    if (uploadDisabled) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onUpload(files);
  };

  return (
    <SectionShell
      id="assets"
      title="附件资源"
      description="为 Agent 提供会随版本保存的参考资料和脚本。"
      actions={
        <Button
          size="sm"
          variant="secondary"
          isDisabled={uploadDisabled}
          onPress={() => ref.current?.click()}
        >
          <Upload size={14} />
          上传附件
        </Button>
      }
    >
      <div
        className={styles.dropZone}
        data-drag-over={isDragOver}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="附件资源">
              <Table.Header>
                <Table.Column isRowHeader>文件</Table.Column>
                <Table.Column>类型与大小</Table.Column>
                <Table.Column>状态</Table.Column>
                <Table.Column>操作</Table.Column>
              </Table.Header>
              <Table.Body
                items={assets}
                renderEmptyState={() => <div className={styles.empty}>暂无附件</div>}
              >
                {(asset) => (
                  <Table.Row id={asset.id}>
                    <Table.Cell>
                      <strong>{asset.name}</strong>
                    </Table.Cell>
                    <Table.Cell>
                      {asset.assetResourceType} · {formatFileSize(asset.size)}
                    </Table.Cell>
                    <Table.Cell>
                      {asset.uploadStatus === 'AVAILABLE' ? '可用' : '上传中'}
                    </Table.Cell>
                    <Table.Cell>
                      <AppIconButton
                        icon={<Trash2 size={14} aria-hidden="true" />}
                        label={`删除 ${asset.name}`}
                        size="sm"
                        isDisabled={disabled}
                        onPress={() => onDelete(asset.id)}
                      />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {isDragOver ? <div className={styles.dropHint}>松开即可上传附件</div> : null}
      </div>
      <input
        ref={ref}
        hidden
        multiple
        type="file"
        onChange={(e) => {
          onUpload(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </SectionShell>
  );
}
