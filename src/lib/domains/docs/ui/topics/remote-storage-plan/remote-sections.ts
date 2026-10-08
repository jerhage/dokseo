import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { SECTIONS as SECURITY_SECTIONS } from '../security-headers/sections';
import { SERIES_PLAN_SECTIONS } from '../series-plan/series-sections';

const REMOTE_SECTIONS = {
  goal: 'What a catalog adds',
  opds: 'OPDS 1.2 in brief',
  calibre: "Where Calibre's feeds differ",
  browser: 'What the browser requires',
  contract: 'Books, publications and origins',
  views: 'Tabs, browsing and cards',
  search: 'Searching a catalog',
  download: 'A download, step by step',
  update: 'Replacing a held book',
  series: 'Series: flat for now',
  credentials: 'Passwords',
  proxy: 'Setting up a proxy',
  open: 'What is not built',
} as const;

type RemoteSectionKey = keyof typeof REMOTE_SECTIONS;

function remoteHref(key: RemoteSectionKey): string {
  return `#${anchorSlug(REMOTE_SECTIONS[key])}`;
}

const SECURITY_DIRECTIVES_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.directives)}`;

const SERIES_FORMATS_HREF = `/docs/series-plan#${anchorSlug(SERIES_PLAN_SECTIONS.formats)}`;

export { REMOTE_SECTIONS, SECURITY_DIRECTIVES_HREF, SERIES_FORMATS_HREF, remoteHref };
export type { RemoteSectionKey };
