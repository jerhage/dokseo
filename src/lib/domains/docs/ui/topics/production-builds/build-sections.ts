import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { ARCHITECTURE_SECTIONS } from '../architecture/architecture-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { RENDERING_SECTIONS } from '../rendering-pages/rendering-sections';
import { WORKERS_SECTIONS } from '../workers/workers-sections';

const BUILD_SECTIONS = {
  job: 'What a production build does',
  chunks: 'Modules become chunks',
  split: 'A dynamic import is a split point',
  minify: 'Minification',
  hashing: 'Hashed file names and long-term caching',
  css: 'CSS extraction',
  shaking: 'Tree shaking',
  effects: 'Side effects and the sideEffects field',
  barrels: 'Why a barrel file defeats it',
  flags: 'Dead code behind a build flag',
  devOnly: 'Keeping dev-only code out',
  assets: 'Assets and workers are separate files',
  precache: 'A precache grows with every file',
  measuring: 'Measuring a build',
  dokseoOutput: "Dokseo's build output",
  dokseoDevOnly: 'Leaving /docs out of the build',
  dokseoLazy: 'pdf.js and the recognizers load on demand',
  dokseoRuntime: 'Model weights and WASM at run time',
  dokseoCaching: 'Immutable files in _headers',
  dokseoPrecache: "Dokseo's precache list",
  dokseoBarrels: 'No barrel files in Dokseo',
  rules: 'Rules for a lean build',
} as const;

type BuildSectionKey = keyof typeof BUILD_SECTIONS;

function buildHref(key: BuildSectionKey): string {
  return `#${anchorSlug(BUILD_SECTIONS[key])}`;
}

const OFFLINE_SHELL_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.shell)}`;

const OFFLINE_CACHES_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.caches)}`;

const ARCHITECTURE_BARRELS_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.barrels)}`;

const ARCHITECTURE_LANGUAGES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.languages)}`;

const RENDERING_PDF_LOADING_HREF = `/docs/rendering-pages#${anchorSlug(RENDERING_SECTIONS.pdfLoading)}`;

const OCR_RUNTIME_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.runtime)}`;

const OCR_CACHE_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.cache)}`;

const WORKERS_BUILD_HREF = `/docs/workers#${anchorSlug(WORKERS_SECTIONS.build)}`;

export {
  ARCHITECTURE_BARRELS_HREF,
  ARCHITECTURE_LANGUAGES_HREF,
  BUILD_SECTIONS,
  OCR_CACHE_HREF,
  OCR_RUNTIME_HREF,
  OFFLINE_CACHES_HREF,
  OFFLINE_SHELL_HREF,
  RENDERING_PDF_LOADING_HREF,
  WORKERS_BUILD_HREF,
  buildHref,
};
export type { BuildSectionKey };
