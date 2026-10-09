<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { UNAUTHORIZED_TEXT } from './catalog-texts';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly refused: boolean;
    readonly ondismiss: () => void;
  };

  let { view, refused, ondismiss }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  let open = $state(true);
  let password = $state('');

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (password === '') return;
    view.unlock(password);
  }
</script>

<Modal
  bind:open
  title="Password for {view.catalog.title}"
  size="sm"
  sheetNarrow
  onclose={ondismiss}
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
          bind:value={password}
        />
      {/snippet}
    </Field>
  </form>

  {#snippet footer(close)}
    <Button onclick={close}>Cancel</Button>
    <Button variant="primary" type="submit" form={formId} disabled={password === ''}>Unlock</Button>
  {/snippet}
</Modal>
