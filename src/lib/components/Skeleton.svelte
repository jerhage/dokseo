<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { SKELETON_SHAPES } from './classes';
  import type { SkeletonShape } from './classes';

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    shape?: SkeletonShape;
  };

  let { shape = 'default', class: className, ...rest }: Props = $props();
</script>

<span {...rest} aria-hidden="true" class={['skeleton', SKELETON_SHAPES[shape], className]}></span>
