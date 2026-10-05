<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ClassValue } from 'svelte/elements';
  import type { StatusVariant } from './classes';
  import CircleCheck from './icons/CircleCheck.svelte';
  import CircleX from './icons/CircleX.svelte';
  import Info from './icons/Info.svelte';
  import TriangleAlert from './icons/TriangleAlert.svelte';

  type Props = {
    variant: StatusVariant;
    class?: ClassValue;
  };

  let { variant, class: className }: Props = $props();

  const Shape = $derived(
    match(variant)
      .with('info', () => Info)
      .with('success', () => CircleCheck)
      .with('warning', () => TriangleAlert)
      .with('danger', () => CircleX)
      .exhaustive(),
  );
</script>

<Shape class={className} />
