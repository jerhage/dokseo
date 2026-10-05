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
  core: 'What the core holds',
  fixtures: 'What the fixtures are for',
  normalize: 'The normalizer and the comparison',
  spec: 'The contract spec in kandan-ui-svelte',
  check: 'A fixture against a real component',
  rules: 'Behavior the markup cannot hold',
  coreChecks: "The core's own checks",
  appearance: 'The appearance script in plain JavaScript',
  icons: 'Icons drawn once as SVG',
  behavior: 'Which components run a script',
  nested: 'A subtree inside a subtree',
  updates: 'An update from the core to Dokseo',
  fixBack: 'Sending a fix back in two hops',
  shortcut: 'No shortcut past kandan-ui-svelte',
  pullAfterPush: 'A pull after a push conflicts',
  rejected: 'Rejected: two prefixes in each app',
  dokseo: 'The core in Dokseo',
  built: 'How the core was built',
  today: 'Kandan UI before the core',
  specs: 'Which specs moved',
  phaseCore: 'Building kandan-ui from the Svelte renders',
  phaseSvelte: 'Moving kandan-ui-svelte onto the core',
  phaseDokseo: 'Pulling the core into Dokseo',
  findings: 'What the trial runs found',
  choices: 'The choices and their alternatives',
  next: 'Next, after 1.0: kandan-ui-vanilla',
} as const;

type KandanCoreSectionKey = keyof typeof KANDAN_CORE_SECTIONS;

function kandanCoreHref(key: KandanCoreSectionKey): string {
  return `#${anchorSlug(KANDAN_CORE_SECTIONS[key])}`;
}

const VENDORED_SUBTREE_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.subtree)}`;

const VENDORED_SQUASH_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.squash)}`;

const VENDORED_PUSH_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.push)}`;

const VENDORED_CONTRACT_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.contract)}`;

const VENDORED_FIRST_PAINT_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.firstPaint)}`;

const VENDORED_RULES_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.rules)}`;

const VENDORED_IGNORE_HREF = `/docs/vendored-ui#${anchorSlug(VENDORED_SECTIONS.ignore)}`;

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
  VENDORED_IGNORE_HREF,
  VENDORED_PUSH_HREF,
  VENDORED_REVENDOR_HREF,
  VENDORED_RULES_HREF,
  VENDORED_SQUASH_HREF,
  VENDORED_STRAY_HREF,
  VENDORED_SUBTREE_HREF,
  kandanCoreHref,
};
export type { KandanCoreSectionKey };
