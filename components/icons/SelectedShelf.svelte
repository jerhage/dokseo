<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon
  {...props}
  name="selected-shelf"
  iconNode={[
    ['path', { d: 'M2 7V2h5M17 2h5v5M22 17v5h-5M7 22H2v-5' }],
    [
      'rect',
      { x: '6', y: '13', width: '3', height: '6', rx: '1', fill: 'currentColor', stroke: 'none' },
    ],
    [
      'rect',
      {
        x: '10.5',
        y: '10',
        width: '3',
        height: '9',
        rx: '1',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
    [
      'rect',
      {
        x: '15',
        y: '6',
        width: '3',
        height: '13',
        rx: '1',
        fill: 'currentColor',
        stroke: 'none',
        class: 'icon-highlight',
      },
    ],
  ]}
/>
