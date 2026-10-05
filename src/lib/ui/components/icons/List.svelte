<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon
  {...props}
  name="list"
  iconNode={[
    ['path', { d: 'M3 5h.01' }],
    ['path', { d: 'M3 12h.01' }],
    ['path', { d: 'M3 19h.01' }],
    ['path', { d: 'M8 5h13' }],
    ['path', { d: 'M8 12h13' }],
    ['path', { d: 'M8 19h13' }],
  ]}
/>
