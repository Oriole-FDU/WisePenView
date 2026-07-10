import * as Y from 'yjs';

export function encodeNoteClientStateVector(doc: Y.Doc): string {
  return uint8ArrayToBase64(Y.encodeStateVector(doc));
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}
