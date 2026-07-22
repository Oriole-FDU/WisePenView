import ModelSelector from '@/components/ModelSelector';
import { useChatService } from '@/domains';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';

function ModelPicker({ iconOnly = false }: { iconOnly?: boolean }) {
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
  const selectedModel = useMemo(() => {
    if (availableModels.length === 0) return null;
    const explicitModel = selectedModelId
      ? availableModels.find((model) => model.id === selectedModelId)
      : undefined;
    return explicitModel ?? availableModels.find((model) => model.isDefault) ?? availableModels[0];
  }, [availableModels, selectedModelId]);

  return (
    <ModelSelector
      models={availableModels}
      selectedId={selectedModel?.id}
      isOpen={modelOpen}
      onOpenChange={setModelOpen}
      onChange={(model) => {
        setSelectedModelId(model.id);
        setModelOpen(false);
      }}
      loading={loading}
      placement="top"
      triggerVariant={iconOnly ? 'icon' : 'default'}
    />
  );
}

export default ModelPicker;
