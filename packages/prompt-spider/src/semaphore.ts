/**
 * Async Semaphore untuk membatasi konkurensi eksekusi LLM paralel.
 * Sesuai ADR-002 Lampiran B.2: Konkurensi = 2 cabang paralel.
 */
export class AsyncSemaphore {
  private currentRunning = 0;
  private queue: Array<() => void> = [];

  constructor(public readonly maxConcurrency: number = 2) {
    if (maxConcurrency < 1) {
      throw new Error("maxConcurrency must be at least 1");
    }
  }

  public async acquire(): Promise<void> {
    if (this.currentRunning < this.maxConcurrency) {
      this.currentRunning++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
    this.currentRunning++;
  }

  public release(): void {
    this.currentRunning--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  public async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
