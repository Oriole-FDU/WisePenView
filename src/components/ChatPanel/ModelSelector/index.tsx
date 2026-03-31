// eslint-disable-next-line no-restricted-imports -- ChatPanel 待重构：暂时允许 useEffect
import React, { useState, useMemo, useEffect } from 'react';
import { Popover, Dropdown, Tooltip, Tag, Spin, Empty } from 'antd';
import type { MenuProps } from 'antd';
// 引入图标库
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiEyeLine,
  RiSortAsc,
  RiAppsLine,
  RiCodeSSlashLine,
  RiBarChartLine,
} from 'react-icons/ri';
import clsx from 'clsx';

// 2. 引入 LobeHub AI 图标库
import { OpenAI, Claude, Grok, DeepSeek, Doubao, Meta, Mistral, Gemini } from '@lobehub/icons';

import { useModelList } from '@/hooks/ChatPanel';
import type { Model } from '../index.type';

import styles from './style.module.less';

export const LogoFactory = ({ provider, size = 20 }: { provider: string; size?: number }) => {
  const props = { size };
  switch (provider) {
    case 'openai':
      return <OpenAI.Avatar {...props} />;
    case 'anthropic':
      return <Claude.Avatar {...props} />;
    case 'google':
      return <Gemini.Avatar {...props} />;
    case 'meta':
      return <Meta.Avatar {...props} />;
    case 'grok':
      return <Grok.Avatar {...props} />;
    case 'deepseek':
      return <DeepSeek.Avatar {...props} />;
    case 'doubao':
      return <Doubao.Avatar {...props} />;
    case 'mistral':
      return <Mistral.Avatar {...props} />;
    default:
      return <OpenAI.Avatar {...props} />;
  }
};

const SORT_OPTIONS = [
  { label: '按使用量', value: 'usage', icon: RiBarChartLine },
  { label: '按字母', value: 'alpha', icon: RiSortAsc },
  { label: '推理模型', value: 'reasoning', icon: RiAppsLine },
  { label: '编程模型', value: 'coding', icon: RiCodeSSlashLine },
];

interface ModelSelectorProps {
  value: string;
  onChange: (model: Model) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<string>('usage');

  const { models, loading } = useModelList();

  // 自动选中默认模型
  useEffect(() => {
    if (!loading && models.length > 0) {
      const targetModel = models.find((m) => m.id === value);
      if (!value || !targetModel) {
        onChange(models[0]);
      }
    }
  }, [loading, models, value, onChange]);

  const currentModel = useMemo(
    () => models.find((m) => m.id === value) || models[0],
    [value, models]
  );

  const listTitle = useMemo(() => {
    const map: Record<string, string> = {
      usage: '行业排名（按使用量）',
      alpha: '所有模型（A-Z）',
      reasoning: '深度推理模型',
      coding: '代码生成模型',
    };
    return map[currentSort] || '模型列表';
  }, [currentSort]);

  const processedModels = useMemo(() => {
    const list = [...models];
    switch (currentSort) {
      case 'usage':
        return list.sort((a, b) => a.usageRank - b.usageRank);
      case 'alpha':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'reasoning':
        return list.filter((m) => m.category === 'reasoning');
      case 'coding':
        return list.filter((m) => m.category === 'coding');
      default:
        return list;
    }
  }, [currentSort, models]);

  const sortMenuItems: MenuProps['items'] = SORT_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    icon: <opt.icon />,
    onClick: () => setCurrentSort(opt.value),
    className: currentSort === opt.value ? 'ant-dropdown-menu-item-selected' : '',
  }));

  const content = (
    <div className={styles.selectorPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.headerTitle}>{listTitle}</span>
        <Dropdown
          classNames={{
            itemContent: styles.dropdownItemContent,
            itemIcon: styles.dropdownItemIcon,
          }}
          menu={{ items: sortMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <div className={styles.sortTrigger}>
            {SORT_OPTIONS.find((o) => o.value === currentSort)?.label}
            <RiArrowDownSLine style={{ marginLeft: 4, fontSize: 10 }} />
          </div>
        </Dropdown>
      </div>

      <div className={styles.modelList}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : processedModels.length === 0 ? (
          <div style={{ padding: '20px 0' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模型" />
          </div>
        ) : (
          processedModels.map((model, index) => (
            <div
              key={model.id}
              className={clsx(styles.modelItem, model.id === value && styles.active)}
              onClick={() => {
                onChange(model);
                setOpen(false);
              }}
            >
              {currentSort === 'usage' && <div className={styles.rankNum}>#{index + 1}</div>}

              <div className={styles.itemLeft}>
                <div className={styles.logoWrapper}>
                  {/* 使用 Provider 字段动态生成 Logo */}
                  <LogoFactory provider={model.provider} size={20} />
                </div>

                <div className={styles.modelName}>{model.name}</div>

                {model.vision && (
                  <Tooltip title="支持视觉识别" classNames={{ container: styles.tooltipBody }}>
                    <div className={styles.visionWrapper}>
                      <RiEyeLine />
                    </div>
                  </Tooltip>
                )}

                <div className={styles.tagsRow}>
                  {model.tags.map((tag, idx) => (
                    <Tag key={idx} color={tag.type} className={styles.miniTag}>
                      {tag.text}
                    </Tag>
                  ))}
                </div>
              </div>

              <div className={styles.itemRight}>
                {model.multiplier && <Tag className={styles.multiplierTag}>{model.multiplier}</Tag>}
                {model.id === value && (
                  <RiCheckLine style={{ color: 'var(--ant-color-primary)' }} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
      classNames={{ content: styles.popoverBody }}
    >
      <div className={styles.trigger}>
        {/* 如果正在加载，显示 Loading 图标或占位符 */}
        {loading ? (
          <Spin size="small" style={{ marginRight: 8 }} />
        ) : (
          <LogoFactory provider={(currentModel as Model).provider} size={16} />
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChatPanel 待重构 */}
        <span>{loading ? '模型加载中' : (currentModel as any).name}</span>
        <RiArrowDownSLine style={{ fontSize: 10 }} />
      </div>
    </Popover>
  );
};

export default ModelSelector;
