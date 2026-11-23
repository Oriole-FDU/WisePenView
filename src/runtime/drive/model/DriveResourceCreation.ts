import type { DriveNodeScope } from '@/domains/Drive';

interface DriveResourceCreationBase {
  title: string;
  pathTagId: string;
  scope: DriveNodeScope;
}

export type DriveResourceCreationRequest =
  | (DriveResourceCreationBase & {
      type: 'note';
    })
  | (DriveResourceCreationBase & {
      type: 'drawio';
    })
  | (DriveResourceCreationBase & {
      type: 'agent';
      name?: string;
      description?: string;
    })
  | (DriveResourceCreationBase & {
      type: 'skill';
      name?: string;
      description?: string;
    });
