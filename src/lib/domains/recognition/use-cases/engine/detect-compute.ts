import type { GpuDetection } from '../../domain/engine/compute-choice';

type DetectComputeDeps = {
  readonly probe: () => Promise<{ available: boolean; description: string | null }>;
};

async function detectCompute(deps: DetectComputeDeps): Promise<GpuDetection> {
  const report = await deps.probe();
  return report;
}

export { detectCompute };
export type { DetectComputeDeps };
