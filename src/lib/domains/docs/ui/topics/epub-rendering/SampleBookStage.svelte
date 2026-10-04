<script lang="ts">
  import { untrack } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { onNavigate } from '$app/navigation';
  import type { ReadingSettings } from '$lib/domains/flowing/domain/reading-settings';
  import type { SampleBook } from '../../../domain/sample-epub';
  import { stageNotice } from './book-stage.svelte';
  import type { BookStage } from './book-stage.svelte';
  import type { InkProbe } from './flow-kit';

  type Props = {
    stage: BookStage;
    book: SampleBook;
    settings: ReadingSettings;
    ink: InkProbe;
    label: string;
  };

  let { stage, book, settings, ink, label }: Props = $props();

  const OPENS_WITHIN = '50% 0px';

  const notice = $derived(stageNotice(stage.state));

  const openOnStage: Attachment<HTMLDivElement> = (host) => {
    const held = untrack(() => stage);
    held.attach(host);
    const nearby = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        nearby.disconnect();
        void held.show(
          untrack(() => book),
          untrack(() => settings),
        );
      },
      { rootMargin: OPENS_WITHIN },
    );
    nearby.observe(host);
    return () => {
      nearby.disconnect();
      held.detach();
    };
  };

  onNavigate((navigation) => {
    if (navigation.to?.url.pathname !== navigation.from?.url.pathname) stage.detach();
  });
</script>

{@render ink((read) => stage.paint(read))}

<div class="book-frame bordered rounded-container">
  <div class="book-stage" role="region" aria-label={label} {@attach openOnStage}></div>
  {#if notice !== null}
    <p class="book-notice text-sm text-muted">{notice}</p>
  {/if}
</div>
