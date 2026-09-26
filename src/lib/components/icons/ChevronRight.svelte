<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="chevron-right" iconNode={[['path', { d: 'm9 18 6-6-6-6' }]]} />
