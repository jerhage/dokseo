import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { UI_LIBRARY_SECTIONS } from '../ui-library/sections';
import { RELEASE_SECTIONS } from '../releases-and-ci/sections';
import { SECTIONS as SECURITY_SECTIONS } from '../security-headers/sections';
import { TESTING_SECTIONS } from '../testing/testing-sections';

const VENDORED_SECTIONS = {
  vendoring: 'What vendoring means',
  why: 'Why vendor a UI library',
  tradeoffs: 'A vendored copy against a published package',
  ways: 'Ways to keep a vendored copy',
  submodule: 'A submodule is not vendoring',
  subtree: 'How git subtree works',
  add: 'Adding the library with add',
  squash: 'What --squash leaves in the history',
  pull: 'Updating with pull',
  conflict: 'When a local edit conflicts',
  push: 'Sending a fix back with push',
  split: 'Extracting a library with split',
  copyTool: 'A copy tool with a manifest',
  copyCost: 'What a copy tool would need',
  decision: 'The choice: git subtree',
  today: 'Kandan UI in Dokseo',
  aliases: 'No app aliases',
  tooling: "The library's own tooling",
  ignore: 'How Dokseo ignores that tooling',
  integrate: 'Integrating the library into an app',
  fonts: 'Fonts through relative URLs',
  appearance: 'Saving the appearance',
  firstPaint: 'The script before the first paint',
  contract: 'The attribute contract',
  addTheme: 'Adding a theme',
  playground: 'The playground route',
  specs: 'Specs in the library and in Dokseo',
  update: 'Taking a library update',
  sendBack: 'Sending a fix back to Kandan UI',
  rules: 'Rules for a history with a subtree merge',
  folder: 'One folder for the library',
  outside: 'What stays in each app',
  tests: 'The playground and the specs',
  extract: 'Extracting the library and vendoring it back',
  splitRun: 'Ten commits from the move on',
  revendor: 'Vendoring the library back into Dokseo',
  stray: 'The commit that pulled in all of Dokseo',
  rewrite: 'Rewriting the unpushed branch',
  rejected: 'Fixes I did not use',
  lesson: 'What the extraction taught me',
} as const;

type VendoredSectionKey = keyof typeof VENDORED_SECTIONS;

function vendoredHref(key: VendoredSectionKey): string {
  return `#${anchorSlug(VENDORED_SECTIONS[key])}`;
}

const UI_LIBRARY_LAYERS_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.dokseoLayers)}`;

const UI_LIBRARY_THEMES_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.themes)}`;

const UI_LIBRARY_SCHEMES_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.schemes)}`;

const UI_LIBRARY_DIRECTION_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.direction)}`;

const UI_LIBRARY_PLAYGROUND_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.playground)}`;

const UI_LIBRARY_RULES_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.rules)}`;

const RELEASES_MERGE_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.merging)}`;

const SECURITY_DIRECTIVES_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.directives)}`;

const TESTING_DRIFT_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.drift)}`;

const TESTING_PROJECTS_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.projects)}`;

export {
  RELEASES_MERGE_HREF,
  SECURITY_DIRECTIVES_HREF,
  TESTING_DRIFT_HREF,
  TESTING_PROJECTS_HREF,
  UI_LIBRARY_DIRECTION_HREF,
  UI_LIBRARY_LAYERS_HREF,
  UI_LIBRARY_PLAYGROUND_HREF,
  UI_LIBRARY_RULES_HREF,
  UI_LIBRARY_SCHEMES_HREF,
  UI_LIBRARY_THEMES_HREF,
  VENDORED_SECTIONS,
  vendoredHref,
};
export type { VendoredSectionKey };
