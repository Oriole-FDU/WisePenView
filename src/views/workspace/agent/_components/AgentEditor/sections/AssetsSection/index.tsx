import AppIconButton from '@/components/Button/AppIconButton';
import type { AgentAsset } from '@/domains/Agent';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, Table } from '@heroui/react';
import { Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import SectionShell from '../../shared/SectionShell';
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
  const { t } = useTranslation('agent');
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
      title={t('assets.title')}
      description={t('assets.description')}
      actions={
        <Button
          size="sm"
          variant="secondary"
          isDisabled={uploadDisabled}
          onPress={() => ref.current?.click()}
        >
          <Upload size={14} />
          {t('assets.upload')}
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
            <Table.Content aria-label={t('assets.tableAria')}>
              <Table.Header>
                <Table.Column isRowHeader>{t('assets.file')}</Table.Column>
                <Table.Column>{t('assets.typeAndSize')}</Table.Column>
                <Table.Column>{t('assets.status')}</Table.Column>
                <Table.Column>{t('assets.actions')}</Table.Column>
              </Table.Header>
              <Table.Body
                items={assets}
                renderEmptyState={() => <div className={styles.empty}>{t('assets.empty')}</div>}
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
                      {asset.uploadStatus === 'AVAILABLE'
                        ? t('assets.available')
                        : t('assets.uploading')}
                    </Table.Cell>
                    <Table.Cell>
                      <AppIconButton
                        icon={<Trash2 size={14} aria-hidden="true" />}
                        label={t('assets.delete', { name: asset.name })}
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
        {isDragOver ? <div className={styles.dropHint}>{t('assets.drop')}</div> : null}
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
