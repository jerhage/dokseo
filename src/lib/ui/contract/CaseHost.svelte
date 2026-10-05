<script lang="ts">
  import { untrack } from 'svelte';
  import { provideMenu } from '../components/menu';
  import type { ContractCase } from './cases';

  let { shown }: { shown: ContractCase } = $props();

  if (untrack(() => shown.inMenu) === true) provideMenu({ close: () => {} });
</script>

{@render shown.render()}
