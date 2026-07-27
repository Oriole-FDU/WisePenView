import { FormField, Input } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DriveActionTarget } from '../../common/driveComponentModel';
import type { RenameNodeModalProps } from './index.type';
import styles from './style.module.less';

function getDefaultName(node: DriveActionTarget | null): string {
  if (!node) return '';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function RenameNodeModalContent({
  isOpen,
  node,
  groupId,
  onOpenChange,
  onSuccess,
}: RenameNodeModalProps) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const [name, setName] = useState(getDefaultName(node));
  const [nameError, setNameError] = useState('');

  const { loading, run: runRenameNode } = useRequest(
    async (trimmed: string) => {
      if (!node) return;
      await driveService.renameNode({ nodeId: node.id, newName: trimmed, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('rename.success'));
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!node) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('rename.required'));
      return;
    }
    if (node.type === 'folder') {
      const validation = validateReservedName(trimmed);
      if (!validation.valid) {
        setNameError(t('create.validation.reservedPrefix'));
        return;
      }
    }
    runRenameNode(trimmed);
  };

  const title = node?.type === 'folder' ? t('rename.folderTitle') : t('rename.fileTitle');

  return (
    <AppFormDialog
      isOpen={isOpen && !!node}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setNameError('');
        }
        onOpenChange(nextOpen);
      }}
      title={title}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      isDismissable={!loading}
    >
      <FormField
        aria-label={t('rename.nodeNameAria')}
        label={t('rename.nameLabel')}
        className={styles.input}
        value={name}
        autoFocus
        onChange={(value) => {
          setName(value);
          setNameError('');
        }}
        errorMessage={nameError}
        isRequired
      >
        <Input placeholder={t('rename.placeholder')} />
      </FormField>
    </AppFormDialog>
  );
}

function RenameNodeModal(props: RenameNodeModalProps) {
  const formKey = `${props.isOpen ? 'open' : 'closed'}:${props.node?.id ?? 'empty'}`;
  return <RenameNodeModalContent key={formKey} {...props} />;
}

export default RenameNodeModal;
