<script lang="ts">
  import { untrack } from 'svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import {
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND,
  } from '$lib/shared/layout-choices';
  import type { Language } from '$lib/shared/language';
  import type { Book, BookEdit } from '../domain/book/book';
  import { bookForm, changedFields, formInLanguage, originalTitleHint } from './book-edit-form';
  import { readingDefaultsChosen } from './reading-defaults.svelte';

  type Props = {
    readonly book: Book;
    readonly saving: boolean;
    readonly onsave: (edit: BookEdit) => void;
    readonly onclose: () => void;
  };

  let { book, saving, onsave, onclose }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  let open = $state(true);
  let form = $state(untrack(() => bookForm(book)));

  const downward = $derived(form.layoutKind === 'continuous');

  function requestOpen(next: boolean): void {
    if (saving) return;
    open = next;
  }

  function chooseLanguage(language: Language): void {
    form = formInLanguage(form, language, readingDefaultsChosen().languages[language]);
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (saving) return;
    onsave(changedFields(book, form));
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Book settings" size="sm" {onclose}>
  <form id={formId} class="stack-md" onsubmit={submit}>
    <Field label="Title" hint={originalTitleHint(book)}>
      {#snippet children(control)}
        <Input
          {...control}
          name="title"
          type="text"
          lang={form.language}
          autocomplete="off"
          placeholder={book.title}
          disabled={saving}
          bind:value={form.title}
        />
      {/snippet}
    </Field>

    <Fieldset legend="Language" disabled={saving}>
      <div class="row wrap gap-4">
        <Radio
          name="{uid}-language"
          value="ja"
          group={form.language}
          onchange={() => chooseLanguage('ja')}>Japanese</Radio
        >
        <Radio
          name="{uid}-language"
          value="ko"
          group={form.language}
          onchange={() => chooseLanguage('ko')}>Korean</Radio
        >
        <Radio
          name="{uid}-language"
          value="en"
          group={form.language}
          onchange={() => chooseLanguage('en')}>English</Radio
        >
      </div>
    </Fieldset>

    {#if form.layoutKind !== null}
      <Fieldset legend="Layout" disabled={saving}>
        <div class="row wrap gap-4">
          <Radio name="{uid}-layout" value="paged" bind:group={form.layoutKind}>Pages</Radio>
          <Radio name="{uid}-layout" value="continuous" bind:group={form.layoutKind}>
            Continuous strip
          </Radio>
        </div>
      </Fieldset>
    {/if}

    <Fieldset legend={READING_DIRECTION_LEGEND} disabled={saving || downward}>
      <div class="row wrap gap-4">
        {#each READING_DIRECTION_CHOICES as choice (choice.value)}
          <Radio name="{uid}-direction" value={choice.value} bind:group={form.direction}>
            {choice.label}
          </Radio>
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend={PAGE_PAIRING_LEGEND} disabled={saving || downward}>
      <div class="row wrap gap-4">
        {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
          <Radio name="{uid}-pairing" value={choice.value} bind:group={form.pagePairing}>
            {choice.label}
          </Radio>
        {/each}
      </div>
    </Fieldset>
  </form>

  {#snippet footer(close)}
    <Button disabled={saving} onclick={close}>Cancel</Button>
    <Button variant="primary" type="submit" form={formId} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  {/snippet}
</Modal>
