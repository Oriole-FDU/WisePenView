import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { createReactBlockSpec } from '@blocknote/react';

import styles from './style.module.less';

import 'katex/dist/katex.min.css';

/** KaTeX 公式块（BlockNote block type: `math`） */
export const createMathBlockSpec = createReactBlockSpec(
  {
    type: 'math',
    propSchema: {
      expression: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const [isEditing, setIsEditing] = useState(false);
      const [value, setValue] = useState(props.block.props.expression);
      const mathRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        setValue(props.block.props.expression);
      }, [props.block.props.expression]);

      useEffect(() => {
        if (isEditing || !mathRef.current) return;
        const el = mathRef.current;
        el.replaceChildren();
        const expr = props.block.props.expression.trim();
        if (!expr) return;
        try {
          katex.render(props.block.props.expression, el, { throwOnError: false });
        } catch {
          el.textContent = props.block.props.expression;
        }
      }, [isEditing, props.block.props.expression]);

      const commit = () => {
        props.editor.updateBlock(props.block, {
          props: { ...props.block.props, expression: value },
        });
        setIsEditing(false);
      };

      if (isEditing) {
        return (
          <div contentEditable={false} className={styles.mathInputWrap}>
            <input
              className={styles.mathInput}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  commit();
                }
              }}
              onBlur={() => {
                commit();
              }}
            />
          </div>
        );
      }

      return (
        <div className={styles.mathRoot} onClick={() => setIsEditing(true)}>
          <div ref={mathRef} className={styles.mathPreview}>
            {!props.block.props.expression.trim() ? (
              <span className={styles.mathPlaceholder}>点击输入公式...</span>
            ) : null}
          </div>
        </div>
      );
    },
  }
);
