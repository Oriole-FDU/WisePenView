import { Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppToggleButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';

interface ResourceFavoriteButtonProps {
  isFavorited: boolean;
  isDisabled: boolean;
  showLabel?: boolean;
  onPress: () => void;
}

function ResourceFavoriteButton({
  isFavorited,
  isDisabled,
  showLabel = false,
  onPress,
}: ResourceFavoriteButtonProps) {
  const { t } = useTranslation('resource');
  const label = isFavorited ? t('favorite.action.favorited') : t('favorite.action.favorite');
  const icon = (
    <Bookmark size={16} aria-hidden="true" fill={isFavorited ? 'currentColor' : 'none'} />
  );

  if (showLabel) {
    return (
      <AppToggleButton
        variant="ghost"
        size="sm"
        isSelected={isFavorited}
        isDisabled={isDisabled}
        onPress={onPress}
      >
        {icon}
        <span>{t('comment.feedback.favoriteLabel')}</span>
      </AppToggleButton>
    );
  }

  return (
    <AppIconButton
      icon={icon}
      label={label}
      size="sm"
      isActive={isFavorited}
      isDisabled={isDisabled}
      tooltip={{
        content: isFavorited
          ? t('favorite.action.manageCollections')
          : t('favorite.action.addToCollection'),
      }}
      onPress={onPress}
    />
  );
}

export default ResourceFavoriteButton;
