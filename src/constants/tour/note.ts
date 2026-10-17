import { GUIDE_ACTION_ID } from './actions';
import { step } from './step';
import { GUIDE_TOOL_ID } from './toolId';
import type { GuideTourConfig } from './types';

export const noteTour: GuideTourConfig = {
  steps: [
    step(
      'outline',
      GUIDE_TOOL_ID.noteOutlinePanel,
      'note.outline.title',
      'note.outline.content',
      'right',
      GUIDE_ACTION_ID.openOutline,
      {
        offset: 20,
        preventFlip: false,
        restore: GUIDE_ACTION_ID.openOutline,
      }
    ),
    step(
      'more',
      GUIDE_TOOL_ID.noteMoreOpen,
      'note.more.title',
      'note.more.content',
      'left',
      GUIDE_ACTION_ID.openResourceMenu,
      {
        offset: 20,
        preventFlip: false,
        spotlightToolIds: [GUIDE_TOOL_ID.noteMore, GUIDE_TOOL_ID.noteMoreOpen],
      }
    ),
    step(
      'export',
      GUIDE_TOOL_ID.notePrintPdf,
      'note.export.title',
      'note.export.content',
      'left',
      GUIDE_ACTION_ID.openResourceMenu,
      {
        offset: 20,
        preventFlip: false,
        spotlightToolIds: [GUIDE_TOOL_ID.notePrintPdf, GUIDE_TOOL_ID.noteDownloadMarkdown],
      }
    ),
    step(
      'chat',
      GUIDE_TOOL_ID.noteChat,
      'note.chat.title',
      'note.chat.content',
      'bottom',
      GUIDE_ACTION_ID.openChat,
      {
        offset: 8,
        preventFlip: false,
        spotlightToolIds: [GUIDE_TOOL_ID.noteChat, GUIDE_TOOL_ID.noteAiPanel],
      }
    ),
  ],
};
