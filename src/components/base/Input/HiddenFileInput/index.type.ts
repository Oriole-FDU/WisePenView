import type { ComponentPropsWithRef } from 'react';

export type HiddenFileInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;
