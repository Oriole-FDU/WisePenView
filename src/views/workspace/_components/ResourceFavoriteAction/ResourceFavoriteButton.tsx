import { Button } from '@heroui/react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface ResourceFavoriteButtonProps {
  isFavorited: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

function ResourceFavoriteButton({ isFavorited, isDisabled, onPress }: ResourceFavoriteButtonProps) {
  const { t } = useTranslation('resource');
  const Icon = isFavorited ? BookmarkCheck : Bookmark;
  return (
    <Button
      variant="secondary"
      className={styles.panelButton}
      aria-pressed={isFavorited}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      <Icon size={16} aria-hidden="true" />
      <span className={styles.panelCopy}>
        <strong>
          {isFavorited ? t('favorite.action.favorited') : t('favorite.action.favorite')}
        </strong>
        <span>
          {isFavorited
            ? t('favorite.action.manageCollections')
            : t('favorite.action.addToCollection')}
        </span>
      </span>
    </Button>
  );
}

export default ResourceFavoriteButton;
