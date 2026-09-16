import '@blocknote/mantine/style.css';

import { type Ref, useImperativeHandle } from 'react';

import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { useNoteEditorRuntimeCoordinator } from './registry/useNoteEditorRuntimeCoordinator';
import { NoteInteractionStoreProvider } from './runtime/NoteInteractionStoreProvider';
import { NoteEditorSurface } from './ui/NoteEditorSurface';

function CustomBlockNote({
  ref,
  ...props
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  return (
    <NoteInteractionStoreProvider access={props.state}>
      <CustomBlockNoteRuntime ref={ref} {...props} />
    </NoteInteractionStoreProvider>
  );
}

function CustomBlockNoteRuntime({
  ref,
  ...props
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const runtimeCoordinator = useNoteEditorRuntimeCoordinator(props);

  useImperativeHandle(ref, () => runtimeCoordinator.editorHandle, [
    runtimeCoordinator.editorHandle,
  ]);

  return (
    <NoteEditorSurface
      editor={runtimeCoordinator.editor}
      runtimeCoordinator={runtimeCoordinator}
      props={props}
    />
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
