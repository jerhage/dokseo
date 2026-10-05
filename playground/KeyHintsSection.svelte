<script lang="ts">
  import Card from '../components/Card.svelte';
  import type { KeyHint } from '../components/key-hints';
  import KeyHints from '../components/KeyHints.svelte';
  import DemoSection from './DemoSection.svelte';

  const LIST_KEYS: readonly KeyHint[] = [
    { keys: ['↑↓'], does: 'move' },
    { keys: ['↵'], does: 'open' },
    { keys: ['esc'], does: 'close' },
  ];

  const CANVAS_KEYS: readonly KeyHint[] = [
    { keys: ['drag'], does: 'select' },
    { keys: ['space', 'drag'], does: 'pan' },
    { keys: ['?'], does: 'show or hide this' },
  ];

  let barHeight = $state(0);
</script>

<DemoSection
  id="key-hints"
  title="Key hints"
  classes={['key-hints', 'key-hints-chips', 'key-hints-sm', 'pin-lift']}
>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">chips</p>
        <KeyHints hints={LIST_KEYS} />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">chips, small, decorative</p>
        <KeyHints hints={CANVAS_KEYS} size="sm" decorative />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">text</p>
        <KeyHints hints={LIST_KEYS} variant="text" />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">inline, in running text</p>
        <p class="text-sm">
          Anywhere in the list: <KeyHints hints={LIST_KEYS} variant="inline" element="span" />.
        </p>
      </div>
    </Card>
    <Card>
      <div
        class="relative overflow-hidden surface-sunken rounded-container aspect-video"
        style:--pin-lift="{barHeight}px"
      >
        <KeyHints
          hints={CANVAS_KEYS}
          size="sm"
          decorative
          class="pin-bottom pin-lift pass-through px-3 py-2"
        />
        <p class="pin-bottom m-0 px-3 py-2 surface border-t text-sm" bind:offsetHeight={barHeight}>
          A bar pinned below
        </p>
      </div>
    </Card>
  </div>
</DemoSection>
