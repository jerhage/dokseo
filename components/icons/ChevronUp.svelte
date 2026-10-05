<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="chevron-up" iconNode={[['path', { d: 'm18 15-6-6-6 6' }]]} />
