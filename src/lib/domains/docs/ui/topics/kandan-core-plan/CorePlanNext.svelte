<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOKSEO_FILES_NAMING_CORE_PATHS, behaviourCount, COMPONENTS } from './core-inventory';
  import { FONT_FOLDER, LIBRARY_STYLESHEET } from './core-snippets';
  import {
    KANDAN_CORE_SECTIONS,
    VENDORED_REVENDOR_HREF,
    VENDORED_RULES_HREF,
    VENDORED_STRAY_HREF,
    kandanCoreHref,
  } from './core-sections';

  type OpenDecision = {
    readonly title: string;
    readonly options: string;
    readonly recommendation: string;
  };

  const markupOnly = behaviourCount('markup');

  const OPEN_DECISIONS: readonly OpenDecision[] = [
    {
      title: 'Fixture format',
      options:
        'One .html file per variant (fixtures/badge/success.html); one file per component with a <template> per variant; or fixture strings in a JavaScript module.',
      recommendation:
        'One .html file per variant. A browser and the static playground read it as it is, a diff shows one variant, and the spec maps the file name to a case.',
    },
    {
      title: 'Generated ids in a fixture',
      options:
        'Leave components with generated ids out of the contract, or write placeholders in the fixture.',
      recommendation:
        'Placeholders. The fixture writes id-1, id-2; the normalizer renames each distinct value of id, popovertarget, aria-controls and aria-labelledby on both sides in order of first appearance, so the spec still checks that the trigger and the sheet name the same id.',
    },
    {
      title: 'The normalizer',
      options:
        'A few regular expressions, as in the demo above, or an HTML parser package as a dev dependency of the Svelte version.',
      recommendation:
        'Start with the regular expressions and their spec; switch to a parser when a fixture needs something they cannot read.',
    },
    {
      title: 'Where the icons are generated',
      options:
        'The core ships SVG files only and the Svelte version has a script that writes components/icons/*.svelte; or a build plugin that generates them at build time.',
      recommendation:
        'A script in the Svelte version whose output is committed, with a spec that fails when a committed icon differs from what the script writes. The folder then stays plain files that work at any prefix.',
    },
    {
      title: "The core's language",
      options:
        'Plain JavaScript with JSDoc types, checked with checkJs; or TypeScript with erasable syntax and a build step that writes .js.',
      recommendation:
        "Plain JavaScript with JSDoc types. A browser and Node load the same files with no build, and both of Kandan's tsconfig files already set allowJs and checkJs.",
    },
    {
      title: 'ts-pattern in the core',
      options: 'Keep it as a dependency of the core, or write the one match another way.',
      recommendation:
        'No runtime dependency in the core: an object lookup, as in the Node run above.',
    },
    {
      title: "The core's test runner",
      options: "Node's own test runner, or Vitest.",
      recommendation:
        'node --test. It needs no package, and the core has no Svelte files to compile.',
    },
    {
      title: 'Packaging of the plain behaviors',
      options:
        'One ES module per component exporting a function that connects it to an element and returns a disconnect function; custom elements; or one script that scans data attributes on load.',
      recommendation:
        'One module per component with an explicit connect and disconnect. A custom element would add an element the fixtures do not have.',
    },
    {
      title: 'Shared helper logic',
      options:
        'Move the plain helpers a behavior needs (such as roving.ts for the tab keys) into the core, so both versions run the same code; or write them again for the plain version.',
      recommendation: 'Move each helper when its first plain behavior is written, not before.',
    },
    {
      title: 'Versions of the core',
      options: 'The Svelte version pulls tags, or pulls main.',
      recommendation:
        'Semantic version tags in kandan-ui. The Svelte version pulls a tag and names it in the pull message, as in the run: chore(core): update the core to v0.2.0.',
    },
    {
      title: 'Import paths in apps',
      options:
        'Apps import the core files at their new paths; or the Svelte version keeps modules at the old paths that re-export the core.',
      recommendation:
        'The new paths. A re-export module is a second name for the same file, which Dokseo does not allow in its own code, and the change is one commit.',
    },
    {
      title: 'Order of the last two steps',
      options: 'Move Dokseo onto the core first, or build the plain version first.',
      recommendation:
        'Dokseo first. The contract and the Svelte version are what Dokseo runs on; the plain version has no consumer yet.',
    },
  ];
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.dokseo}>
  <p>
    Dokseo keeps vendoring only <code>kandan-ui-svelte</code>, at <code>src/lib/ui/</code>. The pull
    that brings <code>core/</code> moves the stylesheets, the fonts and the appearance code one
    folder down, and {DOKSEO_FILES_NAMING_CORE_PATHS.length} Dokseo files name one of those paths. A docs
    spec keeps the list current:
  </p>
  <DocsCode
    label="Dokseo files that name src/lib/ui/styles, fonts, appearance or theme-boot"
    code={DOKSEO_FILES_NAMING_CORE_PATHS.join('\n')}
  />
  <p>Among them are the stylesheet import and the font folder that the license plugin reads:</p>
  <DocsCode label={LIBRARY_STYLESHEET.label} code={LIBRARY_STYLESHEET.code} />
  <DocsCode label={FONT_FOLDER.label} code={FONT_FOLDER.code} />
  <p>
    The docs pages that quote library files fail their snippet specs after the move, which is the
    point of those specs, and get their paths updated in the same commit. The pull itself runs on
    <code>main</code>, as every library update does (<a href={VENDORED_RULES_HREF}
      >Rules for a history with a subtree merge</a
    >).
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.order}>
  <StepList>
    <StepItem title="Start kandan-ui">
      The stylesheets and fonts as they are, the appearance code as JavaScript, the icons as SVG
      with Lucide's license, their specs on Node's test runner, and a first tag.
    </StepItem>
    <StepItem title="Vendor the core in kandan-ui-svelte">
      Remove the moved files in one commit and run <code>git subtree add --prefix=core</code> in the
      next, the way Dokseo re-vendored the library (<a href={VENDORED_REVENDOR_HREF}
        >Vendoring the library back into Dokseo</a
      >). Before the first push, count the commits a <code>split --prefix=core</code> returns,
      because a stray commit once pulled a whole history into a split (<a href={VENDORED_STRAY_HREF}
        >The commit that pulled in all of Dokseo</a
      >).
    </StepItem>
    <StepItem title="Move the Svelte version's paths to core/">
      Relative paths in its specs and playground, and the icons generated from the core's SVG files.
    </StepItem>
    <StepItem title="Fixtures and the contract spec">
      The {markupOnly} markup-only components first, then rules and unit specs for the other {COMPONENTS.length -
        markupOnly}.
    </StepItem>
    <StepItem title="Move Dokseo onto the core">
      One subtree pull on <code>main</code>, then the path updates and the refreshed docs quotes in
      the next commit.
    </StepItem>
    <StepItem title="The plain version">
      Behavior modules for the components that need a script, and the static playground page.
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.open}>
  <p>
    These are not settled. Each has the option I would take first; see <a
      href={kandanCoreHref('core')}>What the core holds</a
    > for the parts they apply to.
  </p>
  <ol class="stack-md">
    {#each OPEN_DECISIONS as decision (decision.title)}
      <li>
        <p class="m-0"><strong>{decision.title}.</strong> {decision.options}</p>
        <p class="m-0">Recommendation: {decision.recommendation}</p>
      </li>
    {/each}
  </ol>
</DocsSection>
