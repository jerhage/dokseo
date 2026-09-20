type GpuReport = {
  readonly available: boolean;
  readonly description: string | null;
};

function describe(info: GPUAdapterInfo | undefined): string | null {
  if (info === undefined) return null;

  const parts = [info.vendor, info.architecture].filter((part) => part !== '');
  return parts.length === 0 ? null : parts.join(' ');
}

async function probeGpu(): Promise<GpuReport> {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter === null || adapter === undefined) return { available: false, description: null };
    return { available: true, description: describe(adapter.info) };
  } catch {
    return { available: false, description: null };
  }
}

export { probeGpu };
export type { GpuReport };
