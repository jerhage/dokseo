<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="minus" iconNode={[['path', { d: 'M5 12h14' }]]} />
