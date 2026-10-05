<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { VENDORED_PLAN_SECTIONS, vendoredPlanHref } from './vendored-sections';
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.order}>
  <StepList>
    <StepItem title="This plan">Both ways to vendor, and the choice of git subtree.</StepItem>
    <StepItem title="Prepare Dokseo">
      One <code>src/lib/ui/</code> folder with the components, the styles and the fonts; fonts by
      relative URL; no app aliases; <code>appearance.ts</code> moved in, with
      <code>themeBootScript</code> and Dokseo's drift test; the specs split between the library and
      Dokseo; the playground inside the library; the library's README with the integration guide (<a
        href={vendoredPlanHref('folder')}>One folder for the library</a
      >).
    </StepItem>
    <StepItem title="Extract the library">
      <code>git subtree split</code> into a new repository, then remove the folder from Dokseo and
      vendor it back with <code>git subtree add</code>, so Dokseo uses the library exactly as any
      other app (<a href={vendoredPlanHref('extract')}
        >Extracting the library and vendoring it back</a
      >).
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.open}>
  <p>
    None is open. The library repository is <code>kandan-ui-svelte</code>; the playground ships
    inside the vendored folder (<a href={vendoredPlanHref('tests')}>The playground and the specs</a
    >); a library update is pulled on <code>main</code> directly (<a
      href={vendoredPlanHref('squash')}>What --squash leaves in the history</a
    >); and the library's history starts at the move into <code>src/lib/ui/</code> (<a
      href={vendoredPlanHref('split')}>Extracting a library with split</a
    >). Where the theme script lives is settled too: each app keeps it in its own
    <code>app.html</code>, built from the library's <code>themeBootScript</code> (<a
      href={vendoredPlanHref('outside')}>What stays in each app</a
    >).
  </p>
</DocsSection>
