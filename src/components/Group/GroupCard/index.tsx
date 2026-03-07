import React from 'react';
import { Avatar, Card, Image, Badge } from 'antd';
import styles from './style.module.less';
import type { GroupCardProps } from './index.type';
import { PLACEHOLDER_IMAGE } from '@/utils/image';
import { GROUP_TYPE, getGroupTypeLabel } from '@/constants/group';

const { Meta } = Card;

const GroupCard: React.FC<GroupCardProps> = ({ group, onClick }) => {
  const {
    name: groupName,
    creator,
    coverUrl: cover,
    memberCount = 0,
    type: groupType = GROUP_TYPE.NORMAL,
  } = group;

  const handleCardClick = () => {
    onClick?.(group);
  };

  const cardContent = (
    <Card
      hoverable
      onClick={handleCardClick}
      className={styles.card}
      cover={
        <div className={styles.cover}>
          <Image
            src={cover || PLACEHOLDER_IMAGE}
            alt={groupName}
            preview={false}
            fallback={PLACEHOLDER_IMAGE}
            className={styles.image}
          />
        </div>
      }
    >
      <Meta
        title={groupName}
        description={
          <div className={styles.metaDescription}>
            {creator && (
              <>
                <Avatar size={20} src={creator.avatar} className={styles.creatorAvatar} />
                <span>
                  {groupType === GROUP_TYPE.NORMAL
                    ? creator.nickname
                    : creator.name || creator.nickname}
                </span>
              </>
            )}
            <span className={styles.memberCount}>{memberCount} 成员</span>
          </div>
        }
      />
    </Card>
  );

  if (groupType === GROUP_TYPE.ADVANCED) {
    return (
      <Badge.Ribbon text={getGroupTypeLabel(groupType)} color="#faad14">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  if (groupType === GROUP_TYPE.PUBLIC) {
    return (
      <Badge.Ribbon text={getGroupTypeLabel(groupType)} color="#722ed1">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  return cardContent;
};

export default GroupCard;
