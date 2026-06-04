import { useNoteService, useResourceService } from '@/domains';
import {
  coerceResourceActions,
  maskNoteConfigurableResourceActions,
  normalizeResourceActions,
  NOTE_CONFIGURABLE_RESOURCE_ACTION_OPTIONS,
  RESOURCE_ACTION,
  type ResourceAction,
} from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState } from 'react';
import type { NotePermissionModalProps } from './index.type';

interface SpecifiedUserPermissionRow {
  userId: string;
  actions: ResourceAction[];
}

const buildSpecifiedUserRows = (
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null
): SpecifiedUserPermissionRow[] =>
  Object.entries(specifiedUsersGrantedActions ?? {}).map(([userId, actions]) => ({
    userId,
    actions: maskNoteConfigurableResourceActions(coerceResourceActions(actions as unknown[])),
  }));

const buildSpecifiedUsersGrantedActions = (
  rows: SpecifiedUserPermissionRow[]
): Record<string, ResourceAction[]> | null => {
  if (rows.length === 0) return null;
  return rows.reduce<Record<string, ResourceAction[]>>((acc, row) => {
    acc[row.userId] = maskNoteConfigurableResourceActions(row.actions);
    return acc;
  }, {});
};

const formatActionLabels = (actions: ResourceAction[]) => {
  if (actions.length === 0) return '无权限';
  return actions.map((action) => RESOURCE_ACTION.labels[action] ?? String(action)).join('、');
};

function NotePermissionModal({
  isOpen,
  resourceId,
  onOpenChange,
  onSuccess,
}: NotePermissionModalProps) {
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const [overrideGrantedActionsDraft, setOverrideGrantedActionsDraft] = useState<
    ResourceAction[] | null
  >(null);
  const [specifiedUserRowsDraft, setSpecifiedUserRowsDraft] = useState<
    SpecifiedUserPermissionRow[] | null
  >(null);
  const [newUserId, setNewUserId] = useState('');
  const {
    data: permissionConfig,
    loading,
    error,
  } = useRequest(() => noteService.getNotePermissionConfig({ resourceId }), {
    ready: isOpen && Boolean(resourceId),
    refreshDeps: [isOpen, resourceId],
    onSuccess: () => {
      setOverrideGrantedActionsDraft(null);
      setSpecifiedUserRowsDraft(null);
    },
  });

  const loadedOverrideGrantedActions = useMemo(
    () =>
      maskNoteConfigurableResourceActions(
        coerceResourceActions(permissionConfig?.overrideGrantedActions as unknown[] | undefined)
      ),
    [permissionConfig]
  );

  const loadedSpecifiedUserRows = useMemo(
    () => buildSpecifiedUserRows(permissionConfig?.specifiedUsersGrantedActions),
    [permissionConfig]
  );

  const displayOverrideGrantedActions = overrideGrantedActionsDraft ?? loadedOverrideGrantedActions;
  const displaySpecifiedUserRows = specifiedUserRowsDraft ?? loadedSpecifiedUserRows;

  const overrideActionSet = useMemo(
    () => new Set(displayOverrideGrantedActions),
    [displayOverrideGrantedActions]
  );

  const resetFormDraft = () => {
    setOverrideGrantedActionsDraft(null);
    setSpecifiedUserRowsDraft(null);
    setNewUserId('');
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) resetFormDraft();
    onOpenChange(open);
  };

  const { loading: saving, run: runSavePermission } = useRequest(
    async () =>
      resourceService.updateResourceActionPermission({
        resourceId,
        overrideGrantedActions: maskNoteConfigurableResourceActions(
          normalizeResourceActions(displayOverrideGrantedActions)
        ),
        specifiedUsersGrantedActions: buildSpecifiedUsersGrantedActions(displaySpecifiedUserRows),
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('权限配置已保存');
        onSuccess?.();
        handleModalOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const toggleOverrideAction = (action: ResourceAction) => {
    setOverrideGrantedActionsDraft((prev) => {
      const current = prev ?? loadedOverrideGrantedActions;
      const next = current.includes(action)
        ? current.filter((item) => item !== action)
        : [...current, action];
      return maskNoteConfigurableResourceActions(normalizeResourceActions(next));
    });
  };

  const handleAddSpecifiedUser = () => {
    const userId = newUserId.trim();
    if (!userId) {
      toast.warning('请输入用户 ID');
      return;
    }
    if (displaySpecifiedUserRows.some((row) => row.userId === userId)) {
      toast.warning('该用户已在指定权限列表中');
      return;
    }
    setSpecifiedUserRowsDraft((prev) => [
      ...(prev ?? loadedSpecifiedUserRows),
      { userId, actions: [] },
    ]);
    setNewUserId('');
  };

  const handleRemoveSpecifiedUser = (userId: string) => {
    setSpecifiedUserRowsDraft((prev) =>
      (prev ?? loadedSpecifiedUserRows).filter((row) => row.userId !== userId)
    );
  };

  const toggleSpecifiedUserAction = (userId: string, action: ResourceAction) => {
    setSpecifiedUserRowsDraft((prev) =>
      (prev ?? loadedSpecifiedUserRows).map((row) => {
        if (row.userId !== userId) return row;
        const next = row.actions.includes(action)
          ? row.actions.filter((item) => item !== action)
          : [...row.actions, action];
        return {
          ...row,
          actions: maskNoteConfigurableResourceActions(normalizeResourceActions(next)),
        };
      })
    );
  };

  const renderStatusAlert = (status: 'danger' | 'default' | 'warning', message: string) => (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={handleModalOpenChange}>
      <Modal.Backdrop isDismissable={!saving}>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>权限配置</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {loading ? (
                renderStatusAlert('default', '正在加载权限配置...')
              ) : error ? (
                renderStatusAlert('danger', parseErrorMessage(error))
              ) : permissionConfig ? (
                <>
                  <section>
                    <div>覆盖权限</div>
                    <div>
                      {NOTE_CONFIGURABLE_RESOURCE_ACTION_OPTIONS.map((option) => {
                        const action = option.value as ResourceAction;
                        const selected = overrideActionSet.has(action);
                        return (
                          <Button
                            key={option.key}
                            size="sm"
                            variant={selected ? 'primary' : 'secondary'}
                            onPress={() => toggleOverrideAction(action)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <div>指定用户权限</div>
                    <div>
                      <TextField aria-label="用户 ID" value={newUserId} onChange={setNewUserId}>
                        <Input
                          placeholder="请输入用户 ID"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleAddSpecifiedUser();
                            }
                          }}
                        />
                      </TextField>
                      <Button variant="secondary" onPress={handleAddSpecifiedUser}>
                        添加用户
                      </Button>
                    </div>
                    {displaySpecifiedUserRows.length > 0 ? (
                      <div>
                        {displaySpecifiedUserRows.map((row) => (
                          <div key={row.userId}>
                            <span>{row.userId}</span>
                            <span>{formatActionLabels(row.actions)}</span>
                            <div>
                              {NOTE_CONFIGURABLE_RESOURCE_ACTION_OPTIONS.map((option) => {
                                const action = option.value as ResourceAction;
                                const selected = row.actions.includes(action);
                                return (
                                  <Button
                                    key={option.key}
                                    size="sm"
                                    variant={selected ? 'primary' : 'secondary'}
                                    onPress={() => toggleSpecifiedUserAction(row.userId, action)}
                                  >
                                    {option.label}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              size="sm"
                              variant="danger"
                              onPress={() => handleRemoveSpecifiedUser(row.userId)}
                            >
                              删除
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      renderStatusAlert('default', '暂无指定用户权限')
                    )}
                  </section>
                </>
              ) : (
                renderStatusAlert('default', '暂无权限配置')
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={saving}
                onPress={() => handleModalOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={loading || Boolean(error) || saving}
                onPress={runSavePermission}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default NotePermissionModal;
