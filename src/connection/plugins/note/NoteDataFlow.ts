import * as Y from 'yjs';

import type { ConnectionDataFlow } from '@/connection/core/ConnectionDataFlow';
import {
  ConnectionManager,
  subscribeDataFlowAvailability,
} from '@/connection/core/ConnectionManager';
import type { NoteYjsSocket } from './noteYjsSocket.type';
import { NOTE_YJS_DOCUMENT_FRAGMENT } from './noteYjs.constants';

import type { NoteAdapter } from './NoteAdapter';

export class NoteDataFlow implements ConnectionDataFlow {
  private readonly adapter: NoteAdapter;
  private readonly unsubAvailability: () => void;
  private dataFlowAvailable = false;

  constructor(adapter: NoteAdapter, manager: ConnectionManager) {
    this.adapter = adapter;
    this.unsubAvailability = subscribeDataFlowAvailability(manager, (available) => {
      this.dataFlowAvailable = available;
    });
  }

  dispose(): void {
    this.unsubAvailability();
  }

  subscribeResources(onChange: () => void): () => void {
    return this.adapter.subscribeResources(onChange);
  }

  getResourceVersion(): number {
    return this.adapter.getResourceVersion();
  }

  get doc(): Y.Doc | null {
    return this.adapter.getDoc();
  }

  get provider(): NoteYjsSocket | null {
    return this.adapter.getProvider();
  }

  get xmlFragment(): Y.XmlFragment | null {
    const d = this.doc;
    return d ? d.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT) : null;
  }

  sendIntent(
    operationType: 'COPY' | 'PASTE' | 'UNDO' | 'REDO' | 'KEYBOARD' | 'OTHER',
    source?: string
  ): void {
    if (!this.dataFlowAvailable) return;
    this.adapter.getProvider()?.sendIntent(operationType, source);
  }
}
