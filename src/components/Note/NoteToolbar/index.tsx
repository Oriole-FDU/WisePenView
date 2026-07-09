import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import { FormattingToolbarController } from '@blocknote/react';
import { ButtonGroup, Toolbar } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import { BlockTypeMenu } from './components/BlockTypeMenu';
import { ColorMenu } from './components/ColorMenu';
import { FileCaptionToolbarButton } from './components/FileButtons';
import { CreateLinkToolbarButton } from './components/LinkButton';
import { NestButtons } from './components/NestButtons';
import { TextAlignButtons } from './components/TextAlignButtons';
import { TextStyleButtons } from './components/TextStyleButtons';
import { ToolbarButton } from './components/ToolbarButton';
import type { NoteToolbarProps } from './index.type';
import styles from './style.module.less';
import { stopToolbarMouseDown } from './utils';

function CustomFormattingToolbar({ onAskAi }: NoteToolbarProps) {
  const readOnly = useNoteEditorReadOnlyContext();

  return (
    <Toolbar
      aria-label="格式工具栏"
      isAttached
      className={styles.toolbar}
      onMouseDown={stopToolbarMouseDown}
    >
      {!readOnly ? (
        <>
          <ButtonGroup size="sm" variant="ghost" aria-label="块类型和文件">
            <BlockTypeMenu />
            <FileCaptionToolbarButton />
          </ButtonGroup>
          <TextStyleButtons />
          <TextAlignButtons />
          <ColorMenu />
          <NestButtons />
          <CreateLinkToolbarButton />
        </>
      ) : null}
      <ButtonGroup size="sm" variant="ghost" aria-label="AI">
        <ToolbarButton label="问 AI" icon={<Sparkles size={20} />} onPress={onAskAi} />
      </ButtonGroup>
    </Toolbar>
  );
}

const NoteToolbar = ({ onAskAi }: NoteToolbarProps) => (
  <FormattingToolbarController
    formattingToolbar={() => <CustomFormattingToolbar onAskAi={onAskAi} />}
  />
);

export default NoteToolbar;
