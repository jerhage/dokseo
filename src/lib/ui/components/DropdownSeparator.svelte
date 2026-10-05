<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

  let { class: className, ...rest }: Props = $props();
</script>

<div {...rest} role="separator" class={['dropdown-separator', className]}></div>
