const MAX_DEFAULT_WASM_THREADS = 4;

function defaultWasmThreads(crossOriginIsolated: boolean, logicalCores: number): number {
  if (!crossOriginIsolated) return 1;

  return Math.min(MAX_DEFAULT_WASM_THREADS, Math.ceil((logicalCores || 1) / 2));
}

export { MAX_DEFAULT_WASM_THREADS, defaultWasmThreads };
