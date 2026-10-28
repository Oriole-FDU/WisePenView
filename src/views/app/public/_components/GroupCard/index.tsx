import { Card } from '@heroui/react';
import type { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import UserCapsule from '@/components/base/Avatar/UserCapsule';
import { AppPressable } from '@/components/base/Button';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholderImage';
import { GROUP_TYPE } from '@/domains/Group';

import type { GroupCardProps } from './index.type';
import styles from './style.module.scss';

function GroupCard({ group, onClick }: GroupCardProps) {
  const { t } = useTranslation('group');
  const {
    groupName,
    ownerInfo,
    groupCoverUrl: cover,
    memberCount = 0,
    groupType = GROUP_TYPE.NORMAL,
  } = group;

  const handleCardClick = () => {
    onClick?.(group);
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const ownerName = ownerInfo?.nickname ?? '';
  const groupTypeLabel =
    groupType === GROUP_TYPE.ADVANCED
      ? t('type.advanced')
      : groupType === GROUP_TYPE.PUBLIC
        ? t('type.public')
        : t('type.normal');
  const isSpecialGroup = groupType === GROUP_TYPE.ADVANCED || groupType === GROUP_TYPE.PUBLIC;
  const badgeClassName =
    groupType === GROUP_TYPE.PUBLIC ? `${styles.badge} ${styles.publicBadge}` : styles.badge;

  return (
    <Card className={styles.card}>
      <AppPressable
        className={styles.cardAction}
        aria-label={groupName}
        onClick={handleCardClick}
      />
      <div className={styles.cover}>
        <img
          src={cover || PLACEHOLDER_IMAGE}
          alt={groupName}
          loading="lazy"
          onError={handleImageError}
          className={styles.image}
        />
      </div>
      <div className={styles.body}>
        {isSpecialGroup && <span className={badgeClassName}>{groupTypeLabel}</span>}
        <Card.Header className={styles.header}>
          <Card.Title className={styles.title}>{groupName}</Card.Title>
        </Card.Header>
        <Card.Footer className={styles.footer}>
          {ownerInfo && <UserCapsule name={ownerName} avatar={ownerInfo.avatar} />}
          <span className={styles.memberCount}>
            {t('card.memberCount', { count: memberCount })}
          </span>
        </Card.Footer>
      </div>
    </Card>
  );
}

export default GroupCard;
