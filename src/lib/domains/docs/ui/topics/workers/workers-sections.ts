import { anchorSlug } from '$lib/components/table-of-contents';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { RENDERING_SECTIONS } from '../rendering-pages/rendering-sections';
import { SECTIONS as SECURITY_SECTIONS } from '../security-headers/sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';

const WORKERS_SECTIONS = {
  mainThread: 'One thread for the page',
  kinds: 'Dedicated, shared and service workers',
  starting: 'Starting a module worker',
  scope: 'What a worker cannot touch',
  clone: 'postMessage and the structured clone',
  transfer: 'Transferring instead of copying',
  shared: 'SharedArrayBuffer and Atomics',
  protocol: 'A request and reply protocol',
  lifetime: 'Errors, lifetime and termination',
  map: 'The workers in Dokseo',
  ocr: 'The OCR protocol',
  crop: 'Transferring a crop',
  writer: 'The OPFS writer',
  threads: 'ONNX Runtime threads',
  build: 'Worker files in the build',
  rule: 'Rules for worker code',
} as const;

type WorkersSectionKey = keyof typeof WORKERS_SECTIONS;

function workersHref(key: WorkersSectionKey): string {
  return `#${anchorSlug(WORKERS_SECTIONS[key])}`;
}

const SECURITY_ISOLATION_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.isolation)}`;

const SECURITY_WORKERS_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.workers)}`;

const OCR_WORKER_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.worker)}`;

const OCR_RUNTIME_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.runtime)}`;

const OCR_CROP_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.crop)}`;

const STORAGE_OPFS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.opfs)}`;

const STORAGE_WRITER_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.books)}`;

const RENDERING_OFFSCREEN_HREF = `/docs/rendering-pages#${anchorSlug(RENDERING_SECTIONS.offscreen)}`;

const RENDERING_OWNERSHIP_HREF = `/docs/rendering-pages#${anchorSlug(RENDERING_SECTIONS.ownership)}`;

const RENDERING_PDF_HREF = `/docs/rendering-pages#${anchorSlug(RENDERING_SECTIONS.pdf)}`;

const EXPORT_PROXY_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.proxy)}`;

const OFFLINE_WORKER_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.worker)}`;

export {
  EXPORT_PROXY_HREF,
  OCR_CROP_HREF,
  OCR_RUNTIME_HREF,
  OCR_WORKER_HREF,
  OFFLINE_WORKER_HREF,
  RENDERING_OFFSCREEN_HREF,
  RENDERING_OWNERSHIP_HREF,
  RENDERING_PDF_HREF,
  SECURITY_ISOLATION_HREF,
  SECURITY_WORKERS_HREF,
  STORAGE_OPFS_HREF,
  STORAGE_WRITER_HREF,
  WORKERS_SECTIONS,
  workersHref,
};
export type { WorkersSectionKey };
