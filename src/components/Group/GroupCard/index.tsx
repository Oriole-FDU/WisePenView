import UserCapsule from '@/components/Common/UserCapsule';
import { GROUP_TYPE } from '@/domains/Group';
import { PLACEHOLDER_IMAGE } from '@/utils/image/placeholder';
import { Card } from '@heroui/react';
import type { KeyboardEvent, SyntheticEvent } from 'react';
import type { GroupCardProps } from './index.type';
import styles from './style.module.less';

function GroupCard({ group, onClick }: GroupCardProps) {
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

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const ownerName = ownerInfo?.nickname ?? '';
  const groupTypeLabel = GROUP_TYPE.getLabel(groupType);
  const isSpecialGroup = groupType === GROUP_TYPE.ADVANCED || groupType === GROUP_TYPE.PUBLIC;
  const badgeClassName =
    groupType === GROUP_TYPE.PUBLIC ? `${styles.badge} ${styles.publicBadge}` : styles.badge;

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
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
          <span className={styles.memberCount}>{memberCount} 成员</span>
        </Card.Footer>
      </div>
    </Card>
  );
}

export default GroupCard;
