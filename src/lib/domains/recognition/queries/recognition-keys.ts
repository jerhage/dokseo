import type { Language } from '$lib/shared/language';

const ALL = ['recognition'] as const;

const recognitionKeys = {
  all: () => ALL,
  setup: (language: Language | null) => [...ALL, 'setup', language] as const,
  compute: () => [...ALL, 'compute'] as const,
  modelStorage: (modelId: string) => [...ALL, 'model-storage', modelId] as const,
};

export { recognitionKeys };
