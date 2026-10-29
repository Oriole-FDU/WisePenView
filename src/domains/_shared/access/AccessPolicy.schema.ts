import { z } from 'zod';

import { ACCESS_CONTROL_SCOPE } from './AccessControlScope';
import { RESOURCE_ACTION } from './ResourceAction';

export const ResourceActionSchema = z.enum(RESOURCE_ACTION.options.map((item) => item.value));

export const ResourceActionListSchema = z.array(ResourceActionSchema);

export const AccessControlScopeSchema = z.enum(
  ACCESS_CONTROL_SCOPE.options.map((item) => item.value)
);
