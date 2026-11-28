import type { HiddenFileInputProps } from './index.type';

function HiddenFileInput(props: HiddenFileInputProps) {
  return <input {...props} type="file" hidden />;
}

export default HiddenFileInput;

export type { HiddenFileInputProps } from './index.type';
