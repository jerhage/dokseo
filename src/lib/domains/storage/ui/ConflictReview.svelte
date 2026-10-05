<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
  import type { Language } from '$lib/shared/language';
  import { shownTitle } from '$lib/shared/shown-title';
  import { conflictsOf, noteOf, sideOf } from './captures-import.svelte';
  import type { CapturesImportState, CapturesImportView } from './captures-import.svelte';
  import { versionLabel } from './captures-import-text';

  type Review = Extract<CapturesImportState, { readonly kind: 'reviewing' }>;

  type Props = { readonly view: CapturesImportView; readonly review: Review };

  let { view, review }: Props = $props();

  const uid = $props.id();
  const dates = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const conflicts = $derived(conflictsOf(review.plan));

  function save(event: SubmitEvent): void {
    event.preventDefault();
    view.saveDraft();
  }
</script>

{#snippet version(heading: string, capture: Capture, language: Language)}
  <span class="weight-semibold">{heading}</span>
  <span class="text-xs text-muted">{versionLabel(capture, (at) => dates.format(at))}</span>
  <span class="text-base" lang={language}>{capture.text}</span>
  {#if noteOf(capture) !== null}
    <span class="text-muted accent-start">{noteOf(capture)}</span>
  {/if}
{/snippet}

<section class="col gap-4" aria-label="Conflicts">
  <p class="text-sm text-muted">
    Choose a version for each capture. A capture you leave unchosen keeps this device's version.
    Tags from both are kept.
  </p>
  <ul class="list-reset col gap-6">
    {#each conflicts as conflict (conflict.id)}
      {@const side = sideOf(review.choices.get(conflict.id))}
      {@const chosen = review.choices.get(conflict.id)}
      {@const language = conflict.book.language}
      <li class="col gap-3">
        {#if review.draft !== null && review.draft.id === conflict.id}
          <form class="col gap-3" onsubmit={save}>
            <p class="text-sm weight-semibold">{shownTitle(conflict.book)}</p>
            <Field label="Text">
              {#snippet children(control)}
                <Textarea
                  {...control}
                  rows={3}
                  lang={language}
                  value={review.draft?.text}
                  oninput={(event) => view.draftText(event.currentTarget.value)}
                />
              {/snippet}
            </Field>
            {#if conflict.device.origin !== 'written'}
              <Field label="Note">
                {#snippet children(control)}
                  <Textarea
                    {...control}
                    rows={2}
                    value={review.draft?.note}
                    oninput={(event) => view.draftNote(event.currentTarget.value)}
                  />
                {/snippet}
              </Field>
            {/if}
            <div class="row wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onclick={() => view.cancelDraft()}>Cancel</Button>
              <Button size="sm" variant="primary" type="submit">Save</Button>
            </div>
          </form>
        {:else}
          <Fieldset legend={shownTitle(conflict.book)}>
            <div class="grid-2 gap-2">
              <Radio
                name="{uid}-{conflict.id}"
                value="device"
                group={side}
                variant="tile"
                class="bordered"
                onchange={() => view.pick(conflict.id, 'device')}
              >
                {@render version('This device', conflict.device, language)}
              </Radio>
              <Radio
                name="{uid}-{conflict.id}"
                value="file"
                group={side}
                variant="tile"
                class="bordered"
                onchange={() => view.pick(conflict.id, 'file')}
              >
                {@render version('File', conflict.file, language)}
              </Radio>
              {#if chosen?.kind === 'edit'}
                <Radio
                  name="{uid}-{conflict.id}"
                  value="edit"
                  group={side}
                  variant="tile"
                  class="bordered"
                >
                  <span class="weight-semibold">Your edit</span>
                  <span class="text-base" lang={language}>{chosen.text}</span>
                  {#if chosen.note.trim() !== ''}
                    <span class="text-muted accent-start">{chosen.note}</span>
                  {/if}
                </Radio>
              {/if}
            </div>
            <div class="row">
              <Button size="sm" variant="ghost" onclick={() => view.edit(conflict.id)}>Edit</Button>
            </div>
          </Fieldset>
        {/if}
      </li>
    {/each}
  </ul>
</section>
