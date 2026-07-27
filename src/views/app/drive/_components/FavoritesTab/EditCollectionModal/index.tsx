import { FormField, Input, TextArea } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useInteractService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface EditCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collection: FavoriteCollection | null;
  onSuccess: () => void;
}

function EditCollectionModal({ onOpenChange, collection, onSuccess }: EditCollectionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  const interactService = useInteractService();
  const isCreate = collection == null;
  const [name, setName] = useState(collection?.collectionName ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const { loading, run: submit } = useRequest(
    async () => {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      if (isCreate) {
        await interactService.createFavoriteCollection({
          collectionName: trimmedName,
          description: trimmedDescription || null,
        });
      } else {
        await interactService.updateFavoriteCollection({
          collectionId: collection.collectionId,
          collectionName: trimmedName,
          description: trimmedDescription || null,
        });
      }
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(
          isCreate ? t('favorite.collection.createSuccess') : t('favorite.collection.updateSuccess')
        );
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning(t('favorite.picker.nameRequired'));
      return;
    }
    submit();
  };

  return (
    <AppFormDialog
      isOpen
      onOpenChange={onOpenChange}
      title={isCreate ? t('favorite.collection.createTitle') : t('favorite.collection.editTitle')}
      confirmText={
        isCreate ? t('actions.create', { ns: 'common' }) : t('actions.save', { ns: 'common' })
      }
      isSubmitting={loading}
      onSubmit={handleSubmit}
    >
      <div className={styles.body}>
        <FormField
          aria-label={t('favorite.collection.nameLabel')}
          label={t('favorite.collection.nameLabel')}
          value={name}
          onChange={setName}
          isRequired
        >
          <Input placeholder={t('favorite.collection.nameRequiredPlaceholder')} autoFocus />
        </FormField>
        <FormField
          aria-label={t('favorite.collection.descriptionLabel')}
          label={t('favorite.collection.descriptionLabel')}
          value={description}
          onChange={setDescription}
        >
          <TextArea placeholder={t('favorite.collection.descriptionPlaceholder')} rows={4} />
        </FormField>
      </div>
    </AppFormDialog>
  );
}

export default EditCollectionModal;
