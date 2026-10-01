import type { Language } from '$lib/shared/language';

const ALL = ['recognition'] as const;

const recognitionKeys = {
  all: () => ALL,
  setup: (language: Language | null) => [...ALL, 'setup', language] as const,
  compute: () => [...ALL, 'compute'] as const,
  tags: () => [...ALL, 'tags'] as const,
  everyCapture: () => [...ALL, 'every-capture'] as const,
  modelStorages: () => [...ALL, 'model-storage'] as const,
  modelStorage: (modelId: string) => [...ALL, 'model-storage', modelId] as const,
};

export { recognitionKeys };
