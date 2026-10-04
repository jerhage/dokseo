<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { TOUCH_SECTIONS } from './touch-and-pointers/sections';
  import TouchConcepts from './touch-and-pointers/TouchConcepts.svelte';
  import TouchDokseo from './touch-and-pointers/TouchDokseo.svelte';
  import TouchLessons from './touch-and-pointers/TouchLessons.svelte';
</script>

<DocsPage slug="touch-and-pointers" sections={Object.values(TOUCH_SECTIONS)}>
  {#snippet lead()}
    Dokseo reads a finger, a mouse and a pen through pointer events, sorts each touch into a tap, a
    swipe, a long press or a drag by distance, time and speed, and shows each device only the
    page-turn settings it can use.
  {/snippet}

  <TouchConcepts />
  <TouchDokseo />
  <TouchLessons />
</DocsPage>
