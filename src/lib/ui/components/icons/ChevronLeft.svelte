<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="chevron-left" iconNode={[['path', { d: 'm15 18-6-6 6-6' }]]} />
