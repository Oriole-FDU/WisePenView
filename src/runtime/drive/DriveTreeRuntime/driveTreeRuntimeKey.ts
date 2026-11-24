import type { DriveTreeRequest } from './index.type';

export const buildDriveTreeRuntimeKey = (request: DriveTreeRequest): string =>
  [
    request.scopeMode ?? 'single',
    request.surface,
    request.mode,
    request.scope.rootId,
    request.load?.kinds?.toSorted().join(',') ?? 'all',
    request.load?.resourceType?.trim().toLowerCase() ?? '',
    request.load?.pageSize ?? '',
    request.multiple ? 'multiple' : 'single',
    [...(request.selectableTypes ?? [])].toSorted().join(','),
    [...(request.excludedGroupIds ?? [])].toSorted().join(','),
    [...(request.initialSelectedIds ?? [])].toSorted().join(','),
    [...(request.disabledNodeIds ?? [])].toSorted().join(','),
    request.refreshTrigger ?? '',
  ].join('|');
