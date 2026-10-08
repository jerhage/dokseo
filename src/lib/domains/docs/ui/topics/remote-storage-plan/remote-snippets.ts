import type { SourceSnippet } from '../ocr/ocr-snippets';

const CONNECT_SOURCES: SourceSnippet = {
  label: 'The connect-src sources today',
  file: 'src/lib/platform/security/content-security-policy.ts',
  code: `'connect-src': [
    'self',
    'https://huggingface.co',
    'https://*.hf.co',
    'https://*.huggingface.co',
    'https://cdn.jsdelivr.net',
  ],`,
};

const REMOTE_SNIPPETS: readonly SourceSnippet[] = [CONNECT_SOURCES];

export { CONNECT_SOURCES, REMOTE_SNIPPETS };
