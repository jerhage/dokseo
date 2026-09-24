<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { SKELETON_SHAPES } from './classes';
  import type { SkeletonShape } from './classes';

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    shape?: SkeletonShape;
    width?: string;
  };

  let { shape = 'default', width, class: className, ...rest }: Props = $props();
</script>

<span
  {...rest}
  aria-hidden="true"
  style:--skeleton-width={width}
  class={['skeleton', SKELETON_SHAPES[shape], className]}
></span>
