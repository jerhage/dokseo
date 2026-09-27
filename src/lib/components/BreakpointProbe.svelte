<script lang="ts">
  type Props = {
    breakpoint: `--${string}`;
    width?: number;
  };

  let { breakpoint, width = $bindable(0) }: Props = $props();
</script>

<div
  class="breakpoint-probe"
  aria-hidden="true"
  style:--breakpoint-probe-width="var({breakpoint})"
  bind:clientWidth={width}
></div>
