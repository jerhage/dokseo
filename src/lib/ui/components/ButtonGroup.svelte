<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Name =
    | { label: string; 'aria-labelledby'?: undefined }
    | { label?: undefined; 'aria-labelledby': string };

  type Props = Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'role' | 'aria-label' | 'aria-labelledby'
  > &
    Name & {
      children: Snippet;
    };

  let {
    label,
    'aria-labelledby': labelledBy,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  role="group"
  aria-label={label}
  aria-labelledby={labelledBy}
  class={['btn-group', className]}
>
  {@render children()}
</div>
