<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { VENDORED_PLAN_SECTIONS, vendoredPlanHref } from './vendored-sections';
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.order}>
  <StepList>
    <StepItem title="This plan">Both ways to vendor, and the choice of git subtree.</StepItem>
    <StepItem title="Prepare Dokseo">
      One <code>src/lib/ui/</code> folder with the components, the styles and the fonts; fonts by
      relative URL; no app aliases; <code>appearance.ts</code> moved in, with the first-paint
      script's reference source and its drift test; the specs and the playground split between the
      library and Dokseo (<a href={vendoredPlanHref('folder')}>One folder for the library</a>).
    </StepItem>
    <StepItem title="Extract the library">
      <code>git subtree split</code> into a new repository, then remove the folder from Dokseo and
      vendor it back with <code>git subtree add</code>, so Dokseo uses the library exactly as any
      other app (<a href={vendoredPlanHref('extract')}
        >Extracting the library and vendoring it back</a
      >).
    </StepItem>
    <StepItem title="Write the library's README">
      The integration guide, in the library repository (<a href={vendoredPlanHref('integrate')}
        >Integrating the library into an app</a
      >).
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.open}>
  <ul class="col gap-2">
    <li>The library repository's name.</li>
    <li>
      Whether the playground ships inside the vendored folder. Today it is a route of Dokseo with
      app imports (<a href={vendoredPlanHref('tests')}>The playground and the specs</a>).
    </li>
    <li>
      How a library update reaches Dokseo's <code>main</code>. Pull requests merge by rebase, which
      drops the merge a <code>pull</code> creates (<a href={vendoredPlanHref('squash')}
        >What --squash leaves in the history</a
      >), so an update needs another way in.
    </li>
    <li>
      Whether the library repository needs history from before the move into
      <code>src/lib/ui/</code>. A split starts at the move, and the older commits stay in Dokseo.
    </li>
  </ul>
  <p>
    Where the theme script lives is settled: each app keeps it in its own <code>app.html</code>,
    built from the library's reference source (<a href={vendoredPlanHref('outside')}
      >What stays in each app</a
    >).
  </p>
</DocsSection>
