import { GUIDE_ACTION_ID } from './actions';
import { step } from './step';
import { GUIDE_TOOL_ID } from './toolId';
import type { GuideTourConfig } from './types';

export const chatTour: GuideTourConfig = {
  steps: [
    step(
      'composer',
      GUIDE_TOOL_ID.chatComposer,
      'chat.composer.title',
      'chat.composer.content',
      'bottom',
      undefined,
      { offset: 0, preventFlip: false }
    ),
    step(
      'upload',
      GUIDE_TOOL_ID.chatUpload,
      'chat.upload.title',
      'chat.upload.content',
      'bottom',
      GUIDE_ACTION_ID.openUploadMenu,
      {
        preventFlip: false,
        restore: GUIDE_ACTION_ID.openUploadMenu,
        spotlightToolIds: [GUIDE_TOOL_ID.chatUpload, GUIDE_TOOL_ID.chatUploadOpen],
      }
    ),
    step(
      'agent',
      GUIDE_TOOL_ID.chatAgent,
      'chat.agent.title',
      'chat.agent.content',
      'bottom',
      GUIDE_ACTION_ID.openAgentMenu,
      {
        preventFlip: false,
        restore: GUIDE_ACTION_ID.openAgentMenu,
        spotlightToolIds: [GUIDE_TOOL_ID.chatAgent, GUIDE_TOOL_ID.chatAgentOpen],
      }
    ),
    step(
      'skill',
      GUIDE_TOOL_ID.chatSkill,
      'chat.skill.title',
      'chat.skill.content',
      'bottom',
      GUIDE_ACTION_ID.openSkillMenu,
      {
        preventFlip: false,
        restore: GUIDE_ACTION_ID.openSkillMenu,
        spotlightToolIds: [GUIDE_TOOL_ID.chatSkill, GUIDE_TOOL_ID.chatSkillOpen],
      }
    ),
    step(
      'model',
      GUIDE_TOOL_ID.chatModel,
      'chat.model.title',
      'chat.model.content',
      'bottom',
      GUIDE_ACTION_ID.openModelMenu,
      {
        offset: 0,
        preventFlip: false,
        restore: GUIDE_ACTION_ID.openModelMenu,
        spotlightToolIds: [GUIDE_TOOL_ID.chatModel, GUIDE_TOOL_ID.chatModelOpen],
      }
    ),
    step(
      'voice',
      GUIDE_TOOL_ID.chatVoice,
      'chat.voice.title',
      'chat.voice.content',
      'bottom',
      undefined,
      {
        preventFlip: false,
      }
    ),
  ],
};
