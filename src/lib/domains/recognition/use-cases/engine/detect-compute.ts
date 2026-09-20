import type { GpuDetection } from '../../domain/engine/compute-choice';

export type DetectComputeDeps = {
  readonly probe: () => Promise<{ available: boolean; description: string | null }>;
};

export async function detectCompute(deps: DetectComputeDeps): Promise<GpuDetection> {
  const report = await deps.probe();
  return report;
}
