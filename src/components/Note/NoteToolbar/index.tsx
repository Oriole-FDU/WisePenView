import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
} from '@blocknote/react';
import { Button } from '@heroui/react';

import { RiSparklingLine } from 'react-icons/ri';

import IconText from '@/components/Common/IconText';
import type { NoteToolbarProps } from './index.type';
import styles from './style.module.less';

const NoteToolbar = ({ onAskAi }: NoteToolbarProps) => (
  <FormattingToolbarController
    formattingToolbar={() => (
      <FormattingToolbar>
        <Button
          variant="primary"
          size="sm"
          className={styles.askAiBtn}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPress={onAskAi}
        >
          <IconText icon={<RiSparklingLine />} iconSize={14}>
            问AI
          </IconText>
        </Button>
        <BlockTypeSelect key="blockTypeSelect" />
        <FileCaptionButton key="fileCaptionButton" />
        <FileReplaceButton key="replaceFileButton" />
        <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
        <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
        <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
        <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
        <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
        <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
        <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
        <TextAlignButton textAlignment="right" key="textAlignRightButton" />
        <ColorStyleButton key="colorStyleButton" />
        <NestBlockButton key="nestBlockButton" />
        <UnnestBlockButton key="unnestBlockButton" />
        <CreateLinkButton key="createLinkButton" />
      </FormattingToolbar>
    )}
  />
);

export default NoteToolbar;
