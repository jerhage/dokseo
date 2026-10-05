import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { ACCESSIBILITY_SECTIONS } from '../accessibility/accessibility-sections';
import { DRIFT_SECTIONS } from '../example-drift/drift-sections';
import { VENDORED_SECTIONS } from '../vendored-ui/vendored-sections';

const KANDAN_CORE_SECTIONS = {
  frameworks: 'One library for several frameworks',
  parts: 'Styles, markup and behavior',
  contract: 'A markup contract',
  native: 'Native elements before scripts',
  options: 'Ways to keep two versions in step',
  today: 'Kandan UI today',
  appearance: 'Appearance code without Svelte',
  icons: 'Icons written as Svelte',
  behavior: 'Which components run a script',
  specs: 'Which specs move',
  core: 'What the core holds',
  fixtures: 'One fixture per variant',
  spec: 'The contract spec',
  check: 'A fixture against a real component',
  rules: 'Behavior the markup cannot hold',
  plain: 'The plain version',
  nested: 'A subtree inside a subtree',
  updates: 'An update from the core to Dokseo',
  fixBack: 'Sending a fix back in two hops',
  shortcut: 'No shortcut past kandan-ui-svelte',
  rejected: 'Rejected: two prefixes in each app',
  dokseo: 'What changes in Dokseo',
  order: 'Order of work',
  open: 'Open decisions',
} as const;

type KandanCoreSectionKey = keyof typeof KANDAN_CORE_SECTIONS;

function kandanCoreHref(key: KandanCoreSectionKey): string {
  return `#${anchorSlug(KANDAN_CORE_SECTIONS[key])}`;
}

const VENDORED_SUBTREE_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.subtree)}`;

const VENDORED_PUSH_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.push)}`;

const VENDORED_CONTRACT_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.contract)}`;

const VENDORED_FIRST_PAINT_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.firstPaint)}`;

const VENDORED_RULES_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.rules)}`;

const VENDORED_STRAY_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.stray)}`;

const VENDORED_REVENDOR_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.revendor)}`;

const DRIFT_RECORDED_HREF = `/docs/example-drift#${anchorSlug(DRIFT_SECTIONS.recorded)}`;

const DRIFT_CHECK_HREF = `/docs/example-drift#${anchorSlug(DRIFT_SECTIONS.check)}`;

const ACCESSIBILITY_NATIVE_HREF = `/docs/accessibility#${anchorSlug(ACCESSIBILITY_SECTIONS.semantics)}`;

const ACCESSIBILITY_DIALOGS_HREF = `/docs/accessibility#${anchorSlug(ACCESSIBILITY_SECTIONS.dialogs)}`;

export {
  ACCESSIBILITY_DIALOGS_HREF,
  ACCESSIBILITY_NATIVE_HREF,
  DRIFT_CHECK_HREF,
  DRIFT_RECORDED_HREF,
  KANDAN_CORE_SECTIONS,
  VENDORED_CONTRACT_HREF,
  VENDORED_FIRST_PAINT_HREF,
  VENDORED_PUSH_HREF,
  VENDORED_REVENDOR_HREF,
  VENDORED_RULES_HREF,
  VENDORED_STRAY_HREF,
  VENDORED_SUBTREE_HREF,
  kandanCoreHref,
};
export type { KandanCoreSectionKey };
