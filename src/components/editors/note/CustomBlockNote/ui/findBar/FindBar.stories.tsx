import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import FindBar from './index';

const meta = {
  title: 'Editors/Note/FindBar',
  component: FindBar,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FindBar>;
export default meta;
type Story = StoryObj;

function FindBarStory() {
  const [query, setQuery] = useState('设计');
  const [replacement, setReplacement] = useState('体验');
  const [replaced, setReplaced] = useState(1);

  return (
    <div style={{ width: 560 }}>
      <FindBar
        query={query}
        replacement={replacement}
        result={{ current: 2, total: 5 }}
        replaced={replaced}
        canReplace
        onQueryChange={setQuery}
        onReplacementChange={setReplacement}
        onPrevious={() => undefined}
        onNext={() => undefined}
        onReplaceCurrent={() => setReplaced((value) => value + 1)}
        onReplaceAll={() => setReplaced(5)}
        onClose={() => undefined}
      />
    </div>
  );
}

export const ReplaceOpen: Story = {
  render: () => <FindBarStory />,
};
