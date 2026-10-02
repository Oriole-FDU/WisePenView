import { parsePath, useLocation, useNavigate } from 'react-router-dom';

import type { DriveResourceLocation } from '@/domains/Drive';
import { buildChatSessionLocation, getChatSessionId } from '@/utils/navigation/chatRoute';
import { buildNewNotePath } from '@/utils/navigation/resourceRoute';

/** 所有新建笔记入口统一打开空白页，首次编辑前不调用创建接口。 */
export function useOpenNewNote() {
  const navigate = useNavigate();
  const location = useLocation();
  return (driveLocation?: DriveResourceLocation) => {
    const { pathname = '', search = '' } = parsePath(buildNewNotePath(driveLocation));
    void navigate(buildChatSessionLocation({ pathname, search }, getChatSessionId(location)));
  };
}
