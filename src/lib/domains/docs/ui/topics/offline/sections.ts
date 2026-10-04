import { anchorSlug } from '$lib/components/table-of-contents';

const OFFLINE_SECTIONS = {
  worker: 'What a service worker is',
  lifecycle: 'The service worker lifecycle',
  caches: 'The Cache API and the HTTP cache',
  strategies: 'Cache strategies',
  install: 'A web app manifest and installing',
  updates: 'How an update reaches an open app',
  shell: "Dokseo's service worker",
  routing: 'Which request gets which strategy',
  readout: "This page's service worker",
  version: 'The build version and the release version',
  offer: 'Offering the update',
  check: 'Checking for updates on request',
  models: 'Model files offline',
  testing: 'Testing offline',
  rules: 'Rules Dokseo keeps',
} as const;

type OfflineSectionKey = keyof typeof OFFLINE_SECTIONS;

function offlineHref(key: OfflineSectionKey): string {
  return `#${anchorSlug(OFFLINE_SECTIONS[key])}`;
}

export { OFFLINE_SECTIONS, offlineHref };
export type { OfflineSectionKey };
