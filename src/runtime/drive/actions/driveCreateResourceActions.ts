import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveResourceCreationRequest } from '../model/DriveResourceCreation';
import type { DriveActionContext } from './driveActionContext';
import type { DriveActions } from './index.type';

export const createDriveCreateResourceAction = (
  context: DriveActionContext
): Pick<DriveActions, 'createResource'> => {
  const {
    services: { agentService, noteService, skillService },
    notify,
  } = context;

  const createResource = async (params: DriveResourceCreationRequest): Promise<string> => {
    switch (params.type) {
      case 'note':
      case 'drawio': {
        const result = await noteService.createNote({
          title: params.title,
          resourceType: params.type === 'drawio' ? 'DRAWIO' : 'NOTE',
          pathTagId: params.pathTagId,
        });
        if (!result.resourceId) {
          throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
        }
        notify(params.scope);
        return result.resourceId;
      }
      case 'agent': {
        const resourceId = await agentService.createAgent(
          params.title,
          params.name,
          params.description,
          params.pathTagId
        );
        notify(params.scope);
        return resourceId;
      }
      case 'skill': {
        const resourceId = await skillService.createSkill(
          params.title,
          params.name,
          params.description,
          params.pathTagId
        );
        notify(params.scope);
        return resourceId;
      }
    }
  };

  return { createResource };
};
