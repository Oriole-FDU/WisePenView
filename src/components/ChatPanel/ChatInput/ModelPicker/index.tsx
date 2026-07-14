import type { Model } from '@/components/ChatPanel/index.type';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import { Popover } from '@/components/Overlay';
import { useChatService } from '@/domains';
import { ListBox, ListBoxItem } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

function ModelPicker() {
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const { availableModels, modelOpen, selectedModelId } = useChatInputStore(
    useShallow((state) => ({
      availableModels: state.availableModels,
      modelOpen: state.modelOpen,
      selectedModelId: state.selectedModelId,
    }))
  );
  const { setModelOpen, setSelectedModelId } = store.getState();
  const { loading } = useRequest(() => chatService.getModels(), {
    onSuccess: (nextModels) => {
      const state = store.getState();
      state.setAvailableModels(nextModels);
      if (nextModels.length === 0) {
        if (state.selectedModelId) state.setSelectedModelId(null);
        return;
      }

      const selectedExists = state.selectedModelId
        ? nextModels.some((model) => model.id === state.selectedModelId)
        : false;
      if (!selectedExists) {
        state.setSelectedModelId((nextModels.find((model) => model.isDefault) ?? nextModels[0]).id);
      }
    },
  });
  const models = availableModels;
  const selectedModel = useMemo(() => {
    if (models.length === 0) return null;
    const explicitModel = selectedModelId
      ? models.find((model) => model.id === selectedModelId)
      : undefined;
    return explicitModel ?? models.find((model) => model.isDefault) ?? models[0];
  }, [models, selectedModelId]);

  const renderProviderText = (model: Model): string => {
    if (model.providerName && model.providerModelName) {
      return `${model.providerName} · ${model.providerModelName}`;
    }
    return model.providerModelName || model.providerName || model.provider;
  };

  function handleModelChange(model: Model): void {
    setSelectedModelId(model.id);
    setModelOpen(false);
  }

  return (
    <Popover isOpen={modelOpen} onOpenChange={setModelOpen}>
      <Popover.Trigger>
        <button type="button" className={styles.modelTrigger} aria-label="选择模型">
          {loading ? (
            <LoaderCircle size={16} className={styles.spinIcon} />
          ) : (
            <ProviderLogo provider={selectedModel?.provider ?? 'openai'} size={16} />
          )}
          <span>{loading ? '模型加载中' : (selectedModel?.name ?? '选择模型')}</span>
          <ChevronDown size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <Popover.DeferredContent
            fallback={
              <div className={`${styles.deferredPopoverPanel} ${styles.deferredModelMenu}`} />
            }
          >
            {() => (
              <div className={styles.modelMenu}>
                <div className={styles.popoverTitle}>模型</div>
                {models.length === 0 ? (
                  <div className={styles.emptyText}>暂无模型</div>
                ) : (
                  <ListBox
                    aria-label="选择模型"
                    selectionMode="single"
                    selectedKeys={selectedModel ? [selectedModel.id] : []}
                    className={styles.listBox}
                  >
                    {models.map((model) => (
                      <ListBoxItem
                        key={model.id}
                        id={model.id}
                        textValue={model.name}
                        onPress={() => handleModelChange(model)}
                      >
                        <span className={styles.modelItem}>
                          <ProviderLogo provider={model.provider} size={18} />
                          <span className={styles.modelInfo}>
                            <span className={styles.modelName}>{model.name}</span>
                            <span className={styles.modelMeta}>{renderProviderText(model)}</span>
                          </span>
                          {selectedModel?.id === model.id ? (
                            <Check size={14} className={styles.checkIcon} />
                          ) : null}
                        </span>
                      </ListBoxItem>
                    ))}
                  </ListBox>
                )}
              </div>
            )}
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ModelPicker;
