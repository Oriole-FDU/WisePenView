import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';

function readSegmentText(words: unknown): string {
  if (!Array.isArray(words)) return '';

  return words
    .map((word) => {
      if (!isRecord(word) || !Array.isArray(word.cw)) return '';
      const candidate = word.cw[0];
      return isRecord(candidate) && typeof candidate.w === 'string' ? candidate.w : '';
    })
    .join('');
}

export class XfyunResultAssembler {
  private readonly segments = new Map<number, string>();

  append(result: unknown): string {
    if (!isRecord(result) || typeof result.sn !== 'number') {
      throw createClientError(FRONTEND_CLIENT_ERROR.SPEECH_RESPONSE_INVALID, {
        reason: '讯飞语音识别结果缺少分片序号',
      });
    }

    if (result.pgs === 'rpl') {
      if (
        !Array.isArray(result.rg) ||
        typeof result.rg[0] !== 'number' ||
        typeof result.rg[1] !== 'number'
      ) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SPEECH_RESPONSE_INVALID, {
          reason: '讯飞语音识别替换结果缺少有效范围',
        });
      }

      const [start, end] = result.rg;
      for (const sequence of this.segments.keys()) {
        if (sequence >= start && sequence <= end) {
          this.segments.delete(sequence);
        }
      }
    }

    this.segments.set(result.sn, readSegmentText(result.ws));
    return this.getText();
  }

  getText(): string {
    return [...this.segments.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text)
      .join('');
  }

  reset(): void {
    this.segments.clear();
  }
}
