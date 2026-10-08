import type { KitConfig } from '@sveltejs/kit';

type ContentSecurityPolicy = NonNullable<NonNullable<KitConfig['csp']>['directives']>;

const CONTENT_SECURITY_POLICY: ContentSecurityPolicy = {
  'default-src': ['none'],
  'base-uri': ['none'],
  'object-src': ['none'],
  'form-action': ['none'],
  'frame-src': ['blob:'],
  'worker-src': ['self', 'blob:'],
  'script-src': ['self', 'wasm-unsafe-eval', 'sha256-0ENZ8B9jcs8Jymy5KvsUKuyqtbGemMuKf9ZH5XdsHcQ='],
  'style-src': ['self', 'unsafe-inline', 'blob:'],
  'img-src': ['self', 'blob:', 'data:'],
  'manifest-src': ['self'],
  'font-src': ['self', 'blob:', 'data:'],
  'media-src': ['self', 'blob:'],
  'connect-src': [
    'self',
    'https://huggingface.co',
    'https://*.hf.co',
    'https://*.huggingface.co',
    'https://cdn.jsdelivr.net',
    'https:',
  ],
};

export { CONTENT_SECURITY_POLICY };
