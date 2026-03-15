/**
 * Pooled FFI Buffer Helpers for @ebowwa/coder native quant operations
 *
 * Uses @ebowwa/bun-native-page BufferPool to reduce GC pressure
 * for high-frequency FFI calls.
 */

import { BufferPool, getPageSize } from '@ebowwa/bun-native-page';

// ============================================================================
// Global Pools
// ============================================================================

const DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB (~8000 Float64 values)

let _singleArrayPool: BufferPool | null = null;
let _dualArrayPool: BufferPool | null = null;

function getSingleArrayPool(): BufferPool {
  if (!_singleArrayPool) {
    const pageSize = getPageSize();
    const bufferSize = Math.max(DEFAULT_BUFFER_SIZE, pageSize.size);
    _singleArrayPool = new BufferPool(bufferSize, 2);
  }
  return _singleArrayPool;
}

function getDualArrayPool(): BufferPool {
  if (!_dualArrayPool) {
    const pageSize = getPageSize();
    const bufferSize = Math.max(DEFAULT_BUFFER_SIZE, pageSize.size);
    _dualArrayPool = new BufferPool(bufferSize, 4);
  }
  return _dualArrayPool;
}

// ============================================================================
// Pooled FFI Helpers
// ============================================================================

export interface PooledFloat64Buffer {
  array: Float64Array;
  release: () => void;
}

export function acquireFloat64Buffer(data: number[] | Float64Array): PooledFloat64Buffer {
  const pool = getSingleArrayPool();
  const buffer = pool.acquire();

  const allocatedSize = buffer.allocatedSize ?? buffer.buffer.byteLength;
  const maxElements = Math.floor(allocatedSize / 8);
  const length = Math.min(data.length, maxElements);
  const float64View = new Float64Array(buffer.buffer, 0, length);

  if (data instanceof Float64Array) {
    float64View.set(data.subarray(0, length));
  } else {
    for (let i = 0; i < length; i++) {
      float64View[i] = data[i] ?? 0;
    }
  }

  return {
    array: float64View,
    release: () => pool.release(buffer),
  };
}

export function acquireDualFloat64Buffers(
  dataX: number[],
  dataY: number[]
): { arrayX: Float64Array; arrayY: Float64Array; release: () => void } {
  const pool = getDualArrayPool();

  const bufferX = pool.acquire();
  const bufferY = pool.acquire();

  const allocatedSizeX = bufferX.allocatedSize ?? bufferX.buffer.byteLength;
  const maxElementsX = Math.floor(allocatedSizeX / 8);
  const lengthX = Math.min(dataX.length, maxElementsX);
  const float64X = new Float64Array(bufferX.buffer, 0, lengthX);
  for (let i = 0; i < lengthX; i++) {
    float64X[i] = dataX[i] ?? 0;
  }

  const allocatedSizeY = bufferY.allocatedSize ?? bufferY.buffer.byteLength;
  const maxElementsY = Math.floor(allocatedSizeY / 8);
  const lengthY = Math.min(dataY.length, maxElementsY);
  const float64Y = new Float64Array(bufferY.buffer, 0, lengthY);
  for (let i = 0; i < lengthY; i++) {
    float64Y[i] = dataY[i] ?? 0;
  }

  return {
    arrayX: float64X,
    arrayY: float64Y,
    release: () => {
      pool.release(bufferX);
      pool.release(bufferY);
    },
  };
}

// ============================================================================
// Pool Management
// ============================================================================

export function getPoolStats(): {
  singleArray: { totalCount: number; availableCount: number; inUseCount: number };
  dualArray: { totalCount: number; availableCount: number; inUseCount: number };
} {
  return {
    singleArray: {
      totalCount: _singleArrayPool?.totalCount ?? 0,
      availableCount: _singleArrayPool?.availableCount ?? 0,
      inUseCount: _singleArrayPool?.inUseCount ?? 0,
    },
    dualArray: {
      totalCount: _dualArrayPool?.totalCount ?? 0,
      availableCount: _dualArrayPool?.availableCount ?? 0,
      inUseCount: _dualArrayPool?.inUseCount ?? 0,
    },
  };
}

export function warmupPools(): void {
  getSingleArrayPool();
  getDualArrayPool();
}

export function destroyPools(): void {
  if (_singleArrayPool) {
    _singleArrayPool.destroy();
    _singleArrayPool = null;
  }
  if (_dualArrayPool) {
    _dualArrayPool.destroy();
    _dualArrayPool = null;
  }
}
