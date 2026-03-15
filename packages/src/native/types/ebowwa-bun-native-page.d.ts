declare module '@ebowwa/bun-native-page' {
  export interface PageSizeInfo {
    size: number;
    is4k: boolean;
    is16k: boolean;
    is64k: boolean;
  }

  export interface PooledBuffer {
    buffer: ArrayBuffer;
    allocatedSize?: number;
  }

  export class BufferPool {
    constructor(bufferSize: number, initialCount?: number);
    acquire(): PooledBuffer;
    release(buffer: PooledBuffer): void;
    get bufferSize(): number;
    get totalCount(): number;
    get availableCount(): number;
    get inUseCount(): number;
    destroy(): void;
  }

  export function getPageSize(): PageSizeInfo;
  export function alignToPage(size: number): number;
}
