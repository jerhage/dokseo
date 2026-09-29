<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    readonly ondismiss: () => void;
    readonly class?: ClassValue;
    readonly children: Snippet;
  };

  const { ondismiss, class: className, children }: Props = $props();

  function hold(event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (event.currentTarget instanceof Element)
      event.currentTarget.setPointerCapture(event.pointerId);
  }

  function swallow(event: PointerEvent): void {
    event.stopPropagation();
  }

  function dismiss(event: PointerEvent): void {
    event.stopPropagation();
    ondismiss();
  }
</script>

<div
  class={['scrim z-sticky', className]}
  aria-hidden="true"
  onpointerdown={hold}
  onpointermove={swallow}
  onpointerup={dismiss}
  onpointercancel={dismiss}
>
  {@render children()}
</div>
