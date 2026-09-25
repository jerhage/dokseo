<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import DemoSection from './DemoSection.svelte';

  const SIDES = ['border-t', 'border-b', 'border-s', 'border-e'];

  const SCHEMES = ['scheme-light', 'scheme-dark'];

  let shown = $state(true);
</script>

<DemoSection
  id="l-chrome"
  title="Page chrome"
  classes={[
    'relative',
    'pin-top',
    'pin-bottom',
    'z-*',
    'hushable',
    'is-hushed',
    'border-*',
    'scheme-*',
    'px-responsive',
  ]}
>
  <div class="relative aspect-video overflow-hidden surface-sunken bordered rounded-container">
    <header
      class={[
        'pin-top z-raised row items-center gap-3 py-2 px-responsive surface border-b scheme-dark hushable',
        { 'is-hushed': !shown },
      ]}
      inert={!shown}
    >
      <Button size="sm" href="#l-chrome">Back</Button>
      <span class="flex-1 truncate">A bar pinned to the top, in the dark scheme</span>
    </header>
    <div class="col items-center justify-end h-full p-8">
      <Button onclick={() => (shown = !shown)}>{shown ? 'Hide chrome' : 'Show chrome'}</Button>
    </div>
    <footer
      class={[
        'pin-bottom z-raised row items-center gap-3 py-2 px-responsive surface border-t scheme-dark hushable',
        { 'is-hushed': !shown },
      ]}
      inert={!shown}
    >
      <span class="text-sm text-muted">Pinned to the bottom</span>
    </footer>
  </div>
  <span class="text-xs text-muted">
    .px-responsive pads by the narrow step when its container is narrower than --breakpoint-compact
    (43.75rem), and by the wide step otherwise.
  </span>
  <div class="grid-3">
    {#each SIDES as side (side)}
      <div class={['surface-raised p-3', side]}><code>.{side}</code></div>
    {/each}
  </div>
  <div class="grid-2">
    {#each SCHEMES as scheme (scheme)}
      <div class={['surface bordered rounded-container p-4 stack-sm', scheme]}>
        <code>.{scheme}</code>
        <span class="text-muted">Pinned whatever the page scheme.</span>
      </div>
    {/each}
  </div>
</DemoSection>
