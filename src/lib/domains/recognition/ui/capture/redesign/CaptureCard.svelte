<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import DropdownSeparator from '$lib/components/DropdownSeparator.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import Check from '$lib/components/icons/Check.svelte';
  import Copy from '$lib/components/icons/Copy.svelte';
  import Ellipsis from '$lib/components/icons/Ellipsis.svelte';
  import NotebookPen from '$lib/components/icons/NotebookPen.svelte';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import TagIcon from '$lib/components/icons/Tag.svelte';
  import type { TextAnchor } from '$lib/shared/anchor';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { BadgeVariant } from '$lib/components/classes';
  import type { FocusTarget } from '../card-editing.svelte';
  import type { Card } from '../capture-cards.svelte';
  import MarkedText from '../MarkedText.svelte';
  import type { CardDrafts, DraftField } from './card-drafts.svelte';
  import { cardTools } from './card-tools';
  import InlineEditor from './InlineEditor.svelte';
  import { chipLine } from './chip-line';
  import { noteLines, plainSegments } from './note-lines';

  type Props = {
    readonly card: Card;
    readonly language: Language | null;
    readonly current: boolean;
    readonly drafts: CardDrafts;
    readonly copied: boolean;
    readonly onseek: ((passage: TextAnchor) => void) | undefined;
    readonly onfollow: (event: MouseEvent) => void;
    readonly onwrite: (field: DraftField, from: FocusTarget | null) => void;
    readonly onsave: (field: DraftField) => void;
    readonly onabandon: (field: DraftField) => void;
    readonly ontag: (from: FocusTarget) => void;
    readonly oncopy: (text: string) => void;
    readonly onremove: (capture: CaptureId) => void;
  };

  let {
    card,
    language,
    current,
    drafts,
    copied,
    onseek,
    onfollow,
    onwrite,
    onsave,
    onabandon,
    ontag,
    oncopy,
    onremove,
  }: Props = $props();

  const uid = $props.id();

  const tools = $derived(cardTools(card));

  const writingText = $derived(drafts.holds('text', card.id));

  const writingNote = $derived(drafts.holds('note', card.id));

  function editorId(field: DraftField): string {
    return `${uid}-${field}`;
  }

  function write(field: DraftField, from: FocusTarget | null): void {
    if (drafts.holds(field, card.id)) {
      document.getElementById(editorId(field))?.focus();
      return;
    }

    onwrite(field, from);
  }

  const tone = $derived(
    match<Card, BadgeVariant | null>(card)
      .with({ tone: 'pending' }, () => 'info')
      .with({ tone: 'failed' }, () => 'danger')
      .with({ tone: 'empty' }, () => 'warning')
      .with({ tone: 'done', origin: 'written' }, () => 'accent')
      .with({ tone: 'done' }, () => null)
      .exhaustive(),
  );

  const line = $derived(chipLine(card.tags));

  const moreNames = $derived(
    card.tags
      .slice(line.shown.length)
      .map((chip) => chip.name)
      .join(', '),
  );

  const note = $derived(
    card.annotation === null
      ? null
      : noteLines(card.annotationSegments ?? plainSegments(card.annotation)),
  );

  function menuTrigger(event: MouseEvent): FocusTarget | null {
    const from = event.currentTarget;
    if (!(from instanceof HTMLElement)) return null;

    const trigger = from.closest('.dropdown')?.querySelector('.dropdown-trigger');
    return trigger instanceof HTMLElement ? trigger : null;
  }
</script>

<article
  class={[
    'card',
    {
      'card-feature': current,
      'bordered-strong': (writingText || writingNote) && !current,
    },
  ]}
  aria-label="Capture at {card.place}"
  aria-current={current ? 'true' : undefined}
>
  <div class="card-body col gap-2 p-3">
    {#if card.tone === 'pending'}
      <span class="col gap-1">
        <Skeleton shape="text" />
        <Skeleton shape="text" width="60%" />
      </span>
    {:else if writingText}
      <InlineEditor
        id={editorId('text')}
        label={card.origin === 'written'
          ? `Note at ${card.place}`
          : `Text of the capture at ${card.place}`}
        value={drafts.draft('text', card.id)}
        {language}
        note={false}
        oninput={(value) => drafts.write('text', card.id, value)}
        onsave={() => onsave('text')}
        onabandon={() => onabandon('text')}
      />
    {:else if card.segments !== null}
      <p class="m-0 text-lg" lang={language}><MarkedText segments={card.segments} /></p>
    {:else if card.text !== null}
      <p class="m-0 text-lg" lang={language}>{card.text}</p>
    {/if}

    {#if card.note !== null}
      <p class={['m-0 text-sm', card.tone === 'failed' ? 'text-danger' : 'text-muted']}>
        {card.note}
      </p>
    {/if}

    {#if writingNote}
      <InlineEditor
        id={editorId('note')}
        label="Note on the capture at {card.place}"
        value={drafts.draft('note', card.id)}
        {language}
        note
        oninput={(value) => drafts.write('note', card.id, value)}
        onsave={() => onsave('note')}
        onabandon={() => onabandon('note')}
      />
    {:else if note !== null}
      <p class="m-0 text-sm accent-start">
        <span class="visually-hidden">Your note:</span>
        {#each note as line, order (order)}{#if order > 0}<br />{/if}<MarkedText
            segments={line}
          />{/each}
      </p>
    {/if}

    {#if line.shown.length > 0}
      <ul class="row items-center gap-2 list-reset min-w-0 overflow-hidden" aria-label="Tags">
        {#each line.shown as chip (chip.id)}
          <li class="row min-w-0"><Badge colour={chip.colour} quiet dot>{chip.name}</Badge></li>
        {/each}
        {#if line.more > 0}
          <li class="shrink-0 text-xs text-muted" title={moreNames}>
            +{line.more}<span class="visually-hidden"> more: {moreNames}</span>
          </li>
        {/if}
      </ul>
    {/if}

    <div class="row items-center gap-1">
      <span class="row items-center gap-1 flex-fill min-w-0 overflow-hidden">
        {#if card.passage !== null && onseek !== undefined}
          {@const passage = card.passage}
          <Button variant="ghost" size="sm" class="px-2 min-w-0" onclick={() => onseek(passage)}>
            <span class="truncate">Go to passage</span>
          </Button>
        {:else if card.href === null}
          <span class="px-2 text-xs text-muted mono truncate">{card.place}</span>
        {:else}
          <Button
            variant="ghost"
            size="sm"
            class="px-2 min-w-0 mono"
            href={card.href}
            onclick={onfollow}
          >
            <span class="truncate">{card.place}</span>
            <span class="visually-hidden">Open the book at this capture</span>
          </Button>
        {/if}
        {#if tone === null}
          <span class="visually-hidden">{card.stateLabel}</span>
        {:else}
          <Badge variant={tone} quiet class="shrink-0">{card.stateLabel}</Badge>
        {/if}
      </span>

      <span class="row items-center gap-0 ms-auto shrink-0">
        {#if tools.text.kind === 'shown'}
          <Button
            variant="ghost"
            size="sm"
            square
            title={tools.text.label}
            onclick={(event) => write('text', event.currentTarget)}
          >
            <Pencil class="btn-icon" />
            <span class="visually-hidden">{tools.text.label}</span>
          </Button>
        {/if}
        {#if tools.note.kind !== 'none'}
          <Button
            variant="ghost"
            size="sm"
            square
            title={tools.note.label}
            onclick={(event) => write('note', event.currentTarget)}
          >
            <NotebookPen class="btn-icon" />
            <span class="visually-hidden">{tools.note.label}</span>
          </Button>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          square
          title="Tags"
          onclick={(event) => ontag(event.currentTarget)}
        >
          <TagIcon class="btn-icon" />
          <span class="visually-hidden">Add a tag to the capture at {card.place}</span>
        </Button>
        {#if tools.copies !== null}
          {@const text = tools.copies}
          <Button
            variant="ghost"
            size="sm"
            square
            title={copied ? 'Copied' : 'Copy the text'}
            onclick={() => oncopy(text)}
          >
            {#if copied}
              <Check class="btn-icon" />
            {:else}
              <Copy class="btn-icon" />
            {/if}
            <span class="visually-hidden">Copy the text of the capture at {card.place}</span>
          </Button>
        {/if}
        <Dropdown variant="ghost" size="sm" align="end" square chevron={false}>
          {#snippet trigger()}
            <Ellipsis class="btn-icon" />
            <span class="visually-hidden">More for the capture at {card.place}</span>
          {/snippet}
          {#if tools.text.kind === 'tucked'}
            <DropdownItem onclick={(event) => write('text', menuTrigger(event))}>
              Edit the text
            </DropdownItem>
            <DropdownSeparator />
          {/if}
          <DropdownItem danger onclick={() => onremove(card.id)}>Remove capture</DropdownItem>
        </Dropdown>
      </span>
    </div>
  </div>
</article>
