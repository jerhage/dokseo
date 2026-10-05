<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="chevron-down" iconNode={[['path', { d: 'm6 9 6 6 6-6' }]]} />
