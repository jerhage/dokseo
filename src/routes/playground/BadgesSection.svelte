<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Tag from '$lib/components/Tag.svelte';
  import TagToggle from '$lib/components/TagToggle.svelte';
  import { TAG_COLOURS } from '$lib/components/classes';
  import type { BadgeVariant, TagColour } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  const VARIANTS: readonly BadgeVariant[] = [
    'success',
    'warning',
    'danger',
    'info',
    'brand',
    'accent',
    'neutral',
  ];

  const TOPICS = ['Design', 'Engineering', 'Research'];

  const INITIAL_TAGS = ['Tokens', 'Layers', 'Themes', 'Schemes'];

  let chosen = $state<readonly string[]>(['Design']);
  let tags = $state<readonly string[]>(INITIAL_TAGS);
  let pressedColours = $state<readonly TagColour[]>(['ruby', 'sky']);

  function choose(topic: string, pressed: boolean): void {
    chosen = pressed ? [...chosen, topic] : chosen.filter((name) => name !== topic);
  }

  function press(colour: TagColour, pressed: boolean): void {
    pressedColours = pressed
      ? [...pressedColours, colour]
      : pressedColours.filter((name) => name !== colour);
  }

  function remove(tag: string): void {
    tags = tags.filter((name) => name !== tag);
  }
</script>

<DemoSection
  id="badge"
  title="Badge and tag"
  classes={['badge', 'badge-dot', 'badge-solid', 'badge-quiet', 'tag', 'tag-remove']}
>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Badges</span>
    <div class="row wrap items-center gap-2">
      {#each VARIANTS as variant (variant)}
        <Badge {variant}>{variant}</Badge>
      {/each}
    </div>
    <div class="row wrap items-center gap-2">
      {#each VARIANTS as variant (variant)}
        <Badge {variant} dot>{variant}</Badge>
      {/each}
    </div>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Tag colours</span>
    <div class="row wrap items-center gap-2">
      {#each TAG_COLOURS as colour (colour)}
        <Badge {colour}>{colour}</Badge>
      {/each}
    </div>
    <div class="row wrap items-center gap-2">
      {#each TAG_COLOURS as colour (colour)}
        <Badge {colour} solid>{colour}</Badge>
      {/each}
    </div>
    <div class="row wrap items-center gap-3">
      {#each TAG_COLOURS as colour (colour)}
        <Badge {colour} quiet dot>{colour}</Badge>
      {/each}
    </div>
    <div class="row wrap items-center gap-2">
      {#each TAG_COLOURS as colour (colour)}
        <Tag {colour}>{colour}</Tag>
      {/each}
    </div>
    <div class="row wrap items-center gap-2">
      {#each TAG_COLOURS as colour (colour)}
        <TagToggle
          {colour}
          pressed={pressedColours.includes(colour)}
          onpressedchange={(pressed) => press(colour, pressed)}>{colour}</TagToggle
        >
      {/each}
    </div>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Toggle tags</span>
    <div class="row wrap items-center gap-2">
      {#each TOPICS as topic (topic)}
        <TagToggle
          pressed={chosen.includes(topic)}
          onpressedchange={(pressed) => choose(topic, pressed)}>{topic}</TagToggle
        >
      {/each}
    </div>
    <p class="text-sm text-muted">Chosen: {chosen.length === 0 ? 'none' : chosen.join(', ')}</p>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Removable tags</span>
    <div class="row wrap items-center gap-2">
      <Tag>Static</Tag>
      {#each tags as tag (tag)}
        <Tag onremove={() => remove(tag)} removeLabel="Remove {tag}">{tag}</Tag>
      {/each}
      <a class="tag" href="#badge">Link tag</a>
    </div>
    <div class="row">
      <Button
        size="sm"
        disabled={tags.length === INITIAL_TAGS.length}
        onclick={() => (tags = INITIAL_TAGS)}>Restore tags</Button
      >
    </div>
  </Card>
</DemoSection>
