import { anchorSlug } from '$lib/components/table-of-contents';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { SECTIONS as SECURITY_SECTIONS } from '../security-headers/sections';

const ASYNC_SECTIONS = {
  loop: 'One thread and an event loop',
  await: 'What await gives back',
  race: 'A stale answer that arrives last',
  latest: 'Latest wins: a request id or an abort',
  abort: 'Canceling with AbortController',
  never: 'Promises that never settle',
  timeout: 'A timeout, and cleaning up after it',
  many: 'Many promises at once',
  unhandled: 'Unhandled rejections and where they go',
  floating: 'A floating promise',
  double: 'A second tap while the first save runs',
  finally: 'Cleaning up with finally',
  activation: 'User activation across an await',
  generations: 'Generation counters in Dokseo',
  exportRound: 'The captures export, round by round',
  boundary: 'One place for unexpected failures',
  blocked: 'Waiting for another tab to let go',
  deadline: 'A deadline for the first GPU run',
  zip: 'Stopping a ZIP read early',
  animations: 'Waiting for animations that may never end',
  importFinally: "The import's refresh in finally",
  foliate: 'foliate-js: the turn lock and the first frame',
  updates: 'Update checks',
  rules: 'Rules for asynchronous code in Dokseo',
} as const;

type AsyncSectionKey = keyof typeof ASYNC_SECTIONS;

function asyncHref(key: AsyncSectionKey): string {
  return `#${anchorSlug(ASYNC_SECTIONS[key])}`;
}

const EPUB_LOCK_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.lock)}`;

const EXPORT_ACTIVATION_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.activation)}`;

const EXPORT_FIRST_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.exportFirst)}`;

const EXPORT_SAVE_FILE_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.saveFile)}`;

const OFFLINE_CHECK_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.check)}`;

const OFFLINE_ROUTING_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.routing)}`;

const SECURITY_WEBKIT_FAILURE_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.webkit)}`;

const WORKERS_HREF = '/docs/workers';

export {
  ASYNC_SECTIONS,
  EPUB_LOCK_HREF,
  EXPORT_ACTIVATION_HREF,
  EXPORT_FIRST_HREF,
  EXPORT_SAVE_FILE_HREF,
  OFFLINE_CHECK_HREF,
  OFFLINE_ROUTING_HREF,
  SECURITY_WEBKIT_FAILURE_HREF,
  WORKERS_HREF,
  asyncHref,
};
export type { AsyncSectionKey };
