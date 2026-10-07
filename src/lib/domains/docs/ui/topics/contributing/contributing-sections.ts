import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { KANDAN_CORE_SECTIONS } from '../kandan-core-plan/core-sections';
import { RELEASE_SECTIONS } from '../releases-and-ci/sections';
import { STORED_FORMAT_SECTIONS } from '../stored-format/stored-format-sections';
import { VENDORED_SECTIONS } from '../vendored-ui/vendored-sections';

const CONTRIBUTING_SECTIONS = {
  repos: 'The three repositories',
  rules: 'Rules',
  types: 'Commit types and the version',
  core: 'A core change',
  svelte: 'Into the Svelte library',
  dokseo: 'Into Dokseo',
  release: 'A Dokseo release',
  rejected: 'When a push is rejected',
} as const;

type ContributingSectionKey = keyof typeof CONTRIBUTING_SECTIONS;

function contributingHref(key: ContributingSectionKey): string {
  return `#${anchorSlug(CONTRIBUTING_SECTIONS[key])}`;
}

const RELEASES_DERIVE_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.derive)}`;

const RELEASES_WORKFLOW_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.releaseWorkflow)}`;

const RELEASES_MERGING_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.merging)}`;

const VENDORED_UPDATE_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.update)}`;

const VENDORED_HISTORY_RULES_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.rules)}`;

const CORE_UPDATES_HREF = `/docs/kandan-core-plan#${anchorSlug(KANDAN_CORE_SECTIONS.updates)}`;

const CORE_FIX_BACK_HREF = `/docs/kandan-core-plan#${anchorSlug(KANDAN_CORE_SECTIONS.fixBack)}`;

const STORED_CHANGING_HREF = `/docs/stored-format#${anchorSlug(STORED_FORMAT_SECTIONS.changing)}`;

export {
  CONTRIBUTING_SECTIONS,
  CORE_FIX_BACK_HREF,
  CORE_UPDATES_HREF,
  RELEASES_DERIVE_HREF,
  RELEASES_MERGING_HREF,
  RELEASES_WORKFLOW_HREF,
  STORED_CHANGING_HREF,
  VENDORED_HISTORY_RULES_HREF,
  VENDORED_UPDATE_HREF,
  contributingHref,
};
export type { ContributingSectionKey };
