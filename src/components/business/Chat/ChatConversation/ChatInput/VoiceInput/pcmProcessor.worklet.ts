declare const sampleRate: number;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: { processorOptions?: Record<string, unknown> });
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: {
    processorOptions?: Record<string, unknown>;
  }) => AudioWorkletProcessor
): void;

interface PcmProcessorOptions {
  processorOptions?: {
    targetSampleRate?: number;
    frameBytes?: number;
  };
}

class WisePenPcmProcessor extends AudioWorkletProcessor {
  private readonly targetSampleRate: number;
  private readonly frameBytes: number;
  private readonly pendingBytes: number[] = [];
  private sampleRateAccumulator = 0;
  private sampleSum = 0;
  private sampleCount = 0;

  constructor(options?: PcmProcessorOptions) {
    super();
    this.targetSampleRate = options?.processorOptions?.targetSampleRate ?? 16000;
    this.frameBytes = options?.processorOptions?.frameBytes ?? 1280;
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (const sample of input) {
      this.sampleSum += sample;
      this.sampleCount += 1;
      this.sampleRateAccumulator += this.targetSampleRate;

      if (this.sampleRateAccumulator >= sampleRate) {
        const averagedSample = this.sampleSum / this.sampleCount;
        const clampedSample = Math.max(-1, Math.min(1, averagedSample));
        const pcmSample =
          clampedSample < 0
            ? Math.round(clampedSample * 0x8000)
            : Math.round(clampedSample * 0x7fff);
        this.pendingBytes.push(pcmSample & 0xff, (pcmSample >> 8) & 0xff);
        this.sampleRateAccumulator -= sampleRate;
        this.sampleSum = 0;
        this.sampleCount = 0;
      }
    }

    while (this.pendingBytes.length >= this.frameBytes) {
      const buffer = new ArrayBuffer(this.frameBytes);
      const frame = new Uint8Array(buffer);
      frame.set(this.pendingBytes.splice(0, this.frameBytes));
      this.port.postMessage(buffer, [buffer]);
    }

    return true;
  }
}

registerProcessor('wisepen-pcm-processor', WisePenPcmProcessor);
