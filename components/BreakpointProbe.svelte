<script lang="ts">
  type Props = {
    breakpoint: `--${string}`;
    width?: number;
    ref?: HTMLDivElement | null | undefined;
  };

  let { breakpoint, width = $bindable(0), ref = $bindable() }: Props = $props();
</script>

<div
  bind:this={ref}
  class="breakpoint-probe"
  aria-hidden="true"
  style:--breakpoint-probe-width="var({breakpoint})"
  bind:clientWidth={width}
></div>
