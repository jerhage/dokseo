<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="check" iconNode={[['path', { d: 'M20 6 9 17l-5-5' }]]} />
