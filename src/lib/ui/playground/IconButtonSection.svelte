<script lang="ts">
  import Card from '../components/Card.svelte';
  import type { ControlSize } from '../components/classes';
  import Copy from '../components/icons/Copy.svelte';
  import Pencil from '../components/icons/Pencil.svelte';
  import Search from '../components/icons/Search.svelte';
  import Tag from '../components/icons/Tag.svelte';
  import IconButton from '../components/IconButton.svelte';
  import DemoSection from './DemoSection.svelte';

  const SIZES: readonly ControlSize[] = ['sm', 'md', 'lg'];

  let pressed = $state(false);
</script>

<DemoSection id="icon-button" title="Icon button" classes={['btn-square', 'btn-icon']}>
  <Card>
    <span class="eyebrow text-faint weight-semibold">Sizes</span>
    <div class="row wrap items-center gap-3">
      {#each SIZES as size (size)}
        <IconButton {size} icon={Search} label="Search, {size}" />
      {/each}
      <IconButton variant="primary" icon={Search} label="Search, primary" />
      <IconButton variant="ghost" icon={Search} label="Search, ghost" />
      <IconButton variant="outline" pill icon={Search} label="Search, outline pill" />
    </div>
  </Card>
  <Card>
    <span class="eyebrow text-faint weight-semibold"> Label and tooltip </span>
    <div class="row wrap items-center gap-3">
      <IconButton size="sm" icon={Copy} label="Copy the text" />
      <IconButton size="sm" icon={Tag} label="Add a tag to the capture at p.12" tooltip="Tags" />
      <IconButton size="sm" icon={Pencil} label="Edit, no tooltip" tooltip={false} />
      <IconButton variant="primary" size="sm" href="#icon-button" label="Back to the top">
        <span lang="ja" aria-hidden="true">読</span>
      </IconButton>
      <IconButton
        variant={pressed ? 'accent' : 'default'}
        size="sm"
        icon={Pencil}
        label="Write a note"
        aria-pressed={pressed}
        onclick={() => (pressed = !pressed)}
      />
      <IconButton size="sm" icon={Pencil} label="Disabled" disabled />
    </div>
  </Card>
</DemoSection>
