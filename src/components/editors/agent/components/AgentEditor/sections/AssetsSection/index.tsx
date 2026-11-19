import { FileText, Trash2, Upload } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { HiddenFileInput } from '@/components/base/Input';
import type { AgentAsset } from '@/domains/Agent';
import { formatFileSize } from '@/utils/format/formatFileSize';

import SettingsListPanel from '../../shared/SettingsListPanel';
import styles from './style.module.scss';

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

  const openFilePicker = () => ref.current?.click();

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
    <AppForm.Section id="assets" title={t('assets.title')} variant="editor">
      <div
        className={styles.dropZone}
        data-drag-over={isDragOver}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <SettingsListPanel
          heading={<strong>{t('assets.listTitle')}</strong>}
          action={
            <AppIconButton
              icon={<Upload size={15} aria-hidden="true" />}
              label={t('assets.upload')}
              size="sm"
              isDisabled={uploadDisabled}
              onPress={openFilePicker}
            />
          }
          isEmpty={assets.length === 0}
          emptyText={t('assets.empty')}
        >
          {assets.map((asset) => (
            <div key={asset.id} className={styles.assetRow}>
              <span className={styles.assetIcon}>
                <FileText size={14} aria-hidden="true" />
              </span>
              <span className={styles.assetCopy}>
                <strong>{asset.name}</strong>
                <small>
                  {asset.assetResourceType} · {formatFileSize(asset.size)} ·{' '}
                  {asset.uploadStatus === 'AVAILABLE'
                    ? t('assets.available')
                    : t('assets.uploading')}
                </small>
              </span>
              <AppIconButton
                icon={<Trash2 size={14} aria-hidden="true" />}
                label={t('assets.delete', { name: asset.name })}
                size="sm"
                isDisabled={disabled}
                onPress={() => onDelete(asset.id)}
              />
            </div>
          ))}
        </SettingsListPanel>
        {isDragOver ? <div className={styles.dropHint}>{t('assets.drop')}</div> : null}
      </div>
      <HiddenFileInput
        ref={ref}
        multiple
        onChange={(event) => {
          onUpload(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </AppForm.Section>
  );
}
