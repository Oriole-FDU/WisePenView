import { useRequest, useUpdateEffect } from 'ahooks';
import type { MenuProps } from 'antd';
import { Dropdown, Empty, Popover, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { ArrowUpAZ, ChartBar, Check, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Claude, DeepSeek, Doubao, Gemini, Grok, Meta, Mistral, OpenAI } from '@lobehub/icons';

import IconText from '@/components/Common/IconText';
import { useChatService } from '@/domains';
import { mapApiModelsToFlatModels } from '@/domains/Chat';
import { useChatModelPreferenceStore } from '@/store/useChatModelPreferenceStore';
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
  { label: '按费率', value: 'ratio', icon: ChartBar },
  { label: '按名字', value: 'name', icon: ArrowUpAZ },
  { label: '深度思考模型', value: 'thinking', icon: LayoutGrid },
];

interface ModelSelectorProps {
  value: string;
  onChange: (model: Model) => void;
}

function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<string>('ratio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const lastSelectedModelId = useChatModelPreferenceStore((state) => state.lastSelectedModelId);
  const setLastSelectedModelId = useChatModelPreferenceStore(
    (state) => state.setLastSelectedModelId
  );
  const chatService = useChatService();
  const { data, loading } = useRequest(() => chatService.getModels());
  const models = useMemo(() => mapApiModelsToFlatModels(data), [data]);

  // 初始化优先使用上次选择，不存在则回退默认模型。
  useUpdateEffect(() => {
    if (!loading && models.length > 0) {
      const targetModel = models.find((m) => m.id === value);
      if (targetModel) {
        if (lastSelectedModelId !== targetModel.id) {
          setLastSelectedModelId(targetModel.id);
        }
        return;
      }

      const preferredModel = lastSelectedModelId
        ? models.find((m) => m.id === lastSelectedModelId)
        : undefined;
      const defaultModel = models.find((m) => m.isDefault);
      const nextModel = preferredModel ?? defaultModel ?? models[0];
      onChange(nextModel);
      if (lastSelectedModelId !== nextModel.id) {
        setLastSelectedModelId(nextModel.id);
      }
    }
  }, [lastSelectedModelId, loading, models, onChange, setLastSelectedModelId, value]);

  const currentModel = useMemo(
    () => models.find((m) => m.id === value) || models.find((m) => m.isDefault) || models[0],
    [value, models]
  );

  const listTitle = useMemo(() => {
    const map: Record<string, string> = {
      ratio: '模型列表（按费率）',
      name: '模型列表（按名字）',
      thinking: '深度思考模型',
    };
    return map[currentSort] || '模型列表';
  }, [currentSort]);

  const processedModels = useMemo(() => {
    const list = [...models];
    const direction = sortOrder === 'asc' ? 1 : -1;
    switch (currentSort) {
      case 'ratio':
        return list.sort((a, b) => (a.ratio - b.ratio) * direction || a.name.localeCompare(b.name));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name) * direction);
      case 'thinking':
        return list
          .filter((m) => m.supportThinking)
          .sort((a, b) => (a.ratio - b.ratio) * direction || a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [currentSort, models, sortOrder]);

  const sortMenuItems: MenuProps['items'] = SORT_OPTIONS.map((opt) => ({
    key: opt.value,
    label: (
      <IconText icon={<opt.icon />} iconSize={14} gap="var(--ant-margin-xs)">
        {opt.label}
      </IconText>
    ),
    onClick: () => setCurrentSort(opt.value),
    className: currentSort === opt.value ? 'ant-dropdown-menu-item-selected' : '',
  }));

  const content = (
    <div className={styles.selectorPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.headerTitle}>{listTitle}</span>
        <div className={styles.sortActions}>
          <button
            type="button"
            className={styles.sortOrderBtn}
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            aria-label={sortOrder === 'asc' ? '切换为降序' : '切换为升序'}
          >
            <IconText
              icon={sortOrder === 'asc' ? <ChevronUp /> : <ChevronDown />}
              iconSize={14}
              gap={2}
            >
              {sortOrder === 'asc' ? '升序' : '降序'}
            </IconText>
          </button>

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
              <IconText icon={<ChevronDown />} iconPosition="end" iconSize={10} gap={4}>
                {SORT_OPTIONS.find((o) => o.value === currentSort)?.label}
              </IconText>
            </div>
          </Dropdown>
        </div>
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
                setLastSelectedModelId(model.id);
                setOpen(false);
              }}
            >
              {currentSort === 'ratio' && <div className={styles.rankNum}>#{index + 1}</div>}

              <div className={styles.itemLeft}>
                <IconText
                  className={styles.modelTitle}
                  textClassName={styles.modelName}
                  icon={<LogoFactory provider={model.provider} size={20} />}
                  iconSize={20}
                  gap="var(--ant-margin-xs)"
                  ellipsis
                >
                  {model.name}
                </IconText>

                {/* {model.vision && (
                  <Tooltip title="支持视觉识别" classNames={{ container: styles.tooltipBody }}>
                    <div className={styles.visionWrapper}>
                      <Eye />
                    </div>
                  </Tooltip>
                )} */}

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
                {model.id === value && <Check style={{ color: 'var(--ant-color-primary)' }} />}
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
        <IconText
          icon={
            loading ? (
              <Spin size="small" />
            ) : (
              <LogoFactory provider={currentModel?.provider ?? 'openai'} size={16} />
            )
          }
          iconSize={16}
          gap="var(--ant-margin-xxs)"
          ellipsis
        >
          {loading ? '模型加载中' : (currentModel?.name ?? '请选择模型')}
        </IconText>
        <IconText icon={<ChevronDown />} iconSize={10} aria-hidden />
      </div>
    </Popover>
  );
}

export default ModelSelector;
