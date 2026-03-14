/**
 * StatusNotification - 保存状态通知
 * 根据离线/队列状态计算 saveStatus，带最小展示「保存中」时长。
 */

export type SaveStatus = 'saving' | 'saved' | 'offline';

export interface StatusNotificationOptions {
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export class StatusNotification {
  private saveStatus: SaveStatus = 'saved';
  private savingDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  private isSavingDisplayLocked = false;
  private readonly onSaveStatusChange?: (status: SaveStatus) => void;

  constructor(options: StatusNotificationOptions = {}) {
    this.onSaveStatusChange = options.onSaveStatusChange;
  }

  /**
   * 显示「保存中」（最小 500ms）
   * @param forceResetToSaved 为 true 时到期直接切 saved；否则再根据 hasDirty/hasPending 决定
   */
  showSaving(forceResetToSaved = false): void {
    if (this.saveStatus === 'saving') return;

    this.saveStatus = 'saving';
    this.isSavingDisplayLocked = true;
    this.onSaveStatusChange?.('saving');

    if (this.savingDisplayTimer) {
      clearTimeout(this.savingDisplayTimer);
    }
    const delay = forceResetToSaved ? 1000 + Math.random() * 500 : 500;
    this.savingDisplayTimer = setTimeout(() => {
      this.savingDisplayTimer = null;
      this.isSavingDisplayLocked = false;
      if (forceResetToSaved) {
        this.saveStatus = 'saved';
        this.onSaveStatusChange?.('saved');
      } else {
        this.onTick?.();
      }
    }, delay);
  }

  /** 到期后由外部再查一次状态（由 Pipeline 传入） */
  setTickCallback(cb: () => void): void {
    this.onTick = cb;
  }
  private onTick: (() => void) | null = null;

  /** 根据 connectionState / hasDirty / hasPending 更新并通知 */
  updateSaveStatus(
    connectionState: 'online' | 'offline',
    hasDirty: boolean,
    hasPending: boolean
  ): void {
    if (connectionState === 'offline') {
      if (this.saveStatus !== 'offline') {
        this.saveStatus = 'offline';
        this.onSaveStatusChange?.('offline');
      }
      return;
    }
    if (this.isSavingDisplayLocked) return;
    if (!hasDirty && !hasPending && this.saveStatus !== 'saved') {
      this.saveStatus = 'saved';
      this.onSaveStatusChange?.('saved');
    }
  }

  getSaveStatus(): SaveStatus {
    return this.saveStatus;
  }

  dispose(): void {
    if (this.savingDisplayTimer) {
      clearTimeout(this.savingDisplayTimer);
      this.savingDisplayTimer = null;
    }
  }
}
