<script lang="ts">
  import Card from '../components/Card.svelte';
  import Thumbnail from '../components/Thumbnail.svelte';
  import DemoSection from './DemoSection.svelte';

  const SIZES = ['sm', 'md', 'lg'] as const;

  const ART =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Cpath fill='%237a8fa6' d='M0 0h4v3H0z'/%3E%3Cpath fill='%23c9a66b' d='M0 3 1.6 1.2 2.6 2.2 3.2 1.6 4 3z'/%3E%3C/svg%3E";
</script>

<DemoSection
  id="thumbnail"
  title="Thumbnail"
  classes={['thumbnail', 'thumbnail-sm', 'thumbnail-lg', 'thumbnail-fill', 'thumbnail-bordered']}
>
  <Card>
    <div class="row wrap items-center gap-4">
      {#each SIZES as size (size)}
        <Thumbnail src={ART} {size} />
      {/each}
      {#each SIZES as size (size)}
        <Thumbnail src={null} {size} />
      {/each}
      <Thumbnail src={ART} size="sm" bordered />
      <Thumbnail src={null} size="sm" bordered />
      <Thumbnail src={null} alt="Cover of a book with no cover" size="lg" bordered />
      <Thumbnail src={ART} ratio="square" size="lg" />
      <Thumbnail src={ART} ratio="video" size="lg" />
    </div>
  </Card>
  <div class="grid-auto grid-auto-sm">
    <div class="stack-sm">
      <Card href="#thumbnail" mediaRatio="portrait" aria-label="A card whose media is a thumbnail">
        {#snippet media()}
          <Thumbnail src={ART} fill />
        {/snippet}
      </Card>
      <code class="text-xs">Card media, fill</code>
    </div>
    <div class="stack-sm">
      <Card href="#thumbnail" mediaRatio="portrait" aria-label="A card with no cover yet">
        {#snippet media()}
          <Thumbnail src={null} fill />
        {/snippet}
      </Card>
      <code class="text-xs">no image</code>
    </div>
  </div>
</DemoSection>
