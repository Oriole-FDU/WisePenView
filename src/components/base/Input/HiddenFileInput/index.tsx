import type { ComponentPropsWithRef } from 'react';

export type HiddenFileInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;

function HiddenFileInput(props: HiddenFileInputProps) {
  return <input {...props} type="file" hidden />;
}

export default HiddenFileInput;
