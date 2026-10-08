<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { UNAUTHORIZED_TEXT } from './catalog-texts';

  type Props = { readonly view: CatalogBrowseView; readonly refused: boolean };

  let { view, refused }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  let open = $state(true);
  let password = $state('');

  function requestOpen(next: boolean): void {
    if (view.unlocking) return;
    open = next;
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (password === '') return;
    void view.unlock(password);
  }
</script>

<Modal
  bind:open={() => open, requestOpen}
  title="Password for {view.catalog.title}"
  size="sm"
  sheetNarrow
  onclose={() => view.dismissPrompt()}
>
  <form id={formId} class="stack-md" onsubmit={submit}>
    {#if refused}
      <Alert variant="warning" aria-live="polite">{UNAUTHORIZED_TEXT}</Alert>
    {/if}
    <Field label="Password" hint="Kept until you close Dokseo. It is never saved.">
      {#snippet children(control)}
        <Input
          {...control}
          name="password"
          type="password"
          autocomplete="off"
          disabled={view.unlocking}
          bind:value={password}
        />
      {/snippet}
    </Field>
  </form>

  {#snippet footer(close)}
    <Button disabled={view.unlocking} onclick={close}>Cancel</Button>
    <Button
      variant="primary"
      type="submit"
      form={formId}
      loading={view.unlocking}
      disabled={view.unlocking || password === ''}
    >
      Unlock
    </Button>
  {/snippet}
</Modal>
