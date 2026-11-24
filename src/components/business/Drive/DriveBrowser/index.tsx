import { useMainShell } from '@/layouts/MainShell/_context';

import MobileDrive from '../MobileDrive';
import TableDrive from '../TableDrive';
import type { DriveBrowserProps } from './index.type';

function DriveBrowser(props: DriveBrowserProps) {
  const { isMobileLayout } = useMainShell();

  if (isMobileLayout) {
    return <MobileDrive {...props} />;
  }

  return <TableDrive {...props} />;
}

export default DriveBrowser;
