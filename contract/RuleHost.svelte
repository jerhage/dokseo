<script lang="ts">
  import { untrack } from 'svelte';
  import { provideMenu } from '../components/menu';
  import { setToaster } from '../components/toast-context';
  import ToastClearance from '../components/ToastClearance.svelte';
  import type { RuleControls } from './rule-controls.svelte';
  import type { RuleSubject } from './rule-subjects';

  let { subject, controls }: { subject: RuleSubject; controls: RuleControls } = $props();

  setToaster(untrack(() => controls.toaster));
  if (untrack(() => subject.inMenu) === true) provideMenu({ close: () => {} });
</script>

{@render subject.render(controls)}
{#if controls.blockEnd !== undefined}
  <ToastClearance blockEnd={controls.blockEnd} />
{/if}
