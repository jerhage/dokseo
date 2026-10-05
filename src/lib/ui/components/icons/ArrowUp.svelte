<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon
  {...props}
  name="arrow-up"
  iconNode={[
    ['path', { d: 'm5 12 7-7 7 7' }],
    ['path', { d: 'M12 19V5' }],
  ]}
/>
