<script lang="ts">
  import { findToaster } from './toast-context';

  type Props = {
    blockEnd: number;
  };

  let { blockEnd }: Props = $props();

  const toaster = findToaster();

  $effect(() => {
    if (toaster === undefined) return;
    return toaster.reserveBlockEnd(blockEnd);
  });
</script>
