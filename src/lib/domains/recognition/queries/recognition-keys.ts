import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';

const ALL = ['recognition'] as const;

const recognitionKeys = {
  all: () => ALL,
  setup: (language: Language) => [...ALL, 'setup', language] as const,
  consent: (language: Language) => [...ALL, 'consent', language] as const,
  compute: () => [...ALL, 'compute'] as const,
  tags: () => [...ALL, 'tags'] as const,
  everyCapture: () => [...ALL, 'every-capture'] as const,
  captures: (book: BookId | null) => [...ALL, 'captures', book] as const,
  modelStorages: () => [...ALL, 'model-storage'] as const,
  modelStorage: (modelId: string) => [...ALL, 'model-storage', modelId] as const,
};

export { recognitionKeys };
