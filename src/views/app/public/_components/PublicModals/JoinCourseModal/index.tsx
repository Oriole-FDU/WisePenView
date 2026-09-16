import { useTranslation } from 'react-i18next';

import JoinByInviteCodeModal from '@/components/business/Group/JoinByInviteCodeModal';
import { useCourseService } from '@/domains';

interface JoinCourseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

function JoinCourseModal({ isOpen, onOpenChange, onJoined }: JoinCourseModalProps) {
  const { t } = useTranslation(['course', 'group']);
  const courseService = useCourseService();

  return (
    <JoinByInviteCodeModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('join.title')}
      inviteCodeLabel={t('join.inviteCode')}
      hint={t('join.hint', { ns: 'group' })}
      invalidCodeMessage={t('join.invalidCode', { ns: 'group' })}
      successMessage={t('join.success')}
      onJoin={(inviteCode) => courseService.joinCourse({ inviteCode })}
      onSuccess={onJoined}
    />
  );
}

export default JoinCourseModal;
