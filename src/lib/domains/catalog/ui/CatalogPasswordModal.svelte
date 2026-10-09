<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { Catalog } from '../domain/catalog';
  import { UNAUTHORIZED_TEXT } from './catalog-texts';

  type Props = {
    readonly catalog: Catalog;
    readonly refused: boolean;
    readonly onunlock: (password: string) => void;
    readonly ondismiss: () => void;
  };

  let { catalog, refused, onunlock, ondismiss }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  let open = $state(true);
  let password = $state('');

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (password === '') return;
    onunlock(password);
  }
</script>

<Modal bind:open title="Password for {catalog.title}" size="sm" sheetNarrow onclose={ondismiss}>
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
