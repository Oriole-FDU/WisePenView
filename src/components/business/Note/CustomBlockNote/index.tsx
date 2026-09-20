import '@blocknote/mantine/style.css';

import { type Ref, useImperativeHandle } from 'react';

import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { useNoteEditorRuntimeCoordinator } from './registry/useNoteEditorRuntimeCoordinator';
import { NoteInteractionStoreProvider } from './runtime/NoteInteractionStoreProvider';
import type { NoteEditorRuntimeProps } from './runtime/runtime.type';
import { useNoteEditorSessionContext } from './session/NoteEditorSessionContext';
import { NoteEditorSurface } from './ui/NoteEditorSurface';

function CustomBlockNote({
  ref,
  ...props
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const { runtime, ui } = useNoteEditorSessionContext();
  if (!ui.canRenderBodyEditor) return null;
  return (
    <NoteInteractionStoreProvider access={runtime.state}>
      <CustomBlockNoteRuntime ref={ref} {...props} {...runtime} />
    </NoteInteractionStoreProvider>
  );
}

function CustomBlockNoteRuntime({
  ref,
  ...props
}: NoteEditorRuntimeProps & { ref?: Ref<NoteBodyEditorHandle> }) {
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
