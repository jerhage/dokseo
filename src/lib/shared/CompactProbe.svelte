<script lang="ts">
  import './compact-probe.css';

  type Props = {
    width: number;
  };

  let { width = $bindable(0) }: Props = $props();
</script>

<div class="compact-probe" aria-hidden="true" bind:clientWidth={width}></div>
