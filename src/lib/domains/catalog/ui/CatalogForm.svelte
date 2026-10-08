<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import type { AuthChoice, CatalogSettingsView } from './catalog-settings.svelte';

  type Props = { readonly view: CatalogSettingsView };

  let { view }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  const AUTH_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'basic', label: 'Username and password' },
  ] as const;

  let open = $state(true);
  const adding = $derived(view.target?.kind === 'add');
  const testing = $derived(view.connection.kind === 'testing');

  function requestOpen(next: boolean): void {
    if (view.saving) return;
    open = next;
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    void view.save();
  }

  function chooseAuth(choice: AuthChoice): void {
    view.chooseAuth(choice);
  }
</script>

<Modal
  bind:open={() => open, requestOpen}
  title={adding ? 'Add catalog' : 'Edit catalog'}
  size="sm"
  sheetNarrow
  onclose={() => view.closeForm()}
>
  <form id={formId} class="stack-md" onsubmit={submit}>
    <Field label="Name" error={view.titleError}>
      {#snippet children(control)}
        <Input
          {...control}
          name="title"
          type="text"
          autocomplete="off"
          disabled={view.saving}
          bind:value={view.title}
        />
      {/snippet}
    </Field>

    <Field label="Server address" error={view.urlError}>
      {#snippet children(control)}
        <Input
          {...control}
          name="url"
          type="url"
          autocomplete="off"
          placeholder="https://calibre.example/opds"
          disabled={view.saving}
          bind:value={view.rootUrl}
        />
      {/snippet}
    </Field>

    <div class="field">
      <span class="field-label" id="{uid}-auth">Sign-in</span>
      <SegmentedControl
        aria-labelledby="{uid}-auth"
        options={AUTH_OPTIONS}
        value={view.authChoice}
        onvaluechange={chooseAuth}
      />
    </div>

    {#if view.authChoice === 'basic'}
      <Field label="Username" error={view.usernameError}>
        {#snippet children(control)}
          <Input
            {...control}
            name="username"
            type="text"
            autocomplete="off"
            disabled={view.saving}
            bind:value={view.username}
          />
        {/snippet}
      </Field>

      <Field label="Password" hint="Kept until you close Dokseo. It is never saved.">
        {#snippet children(control)}
          <Input
            {...control}
            name="password"
            type="password"
            autocomplete="off"
            disabled={view.saving}
            bind:value={view.password}
          />
        {/snippet}
      </Field>
    {/if}

    {#if view.connection.kind === 'done'}
      <Alert variant={view.connection.outcome.variant} aria-live="polite">
        {view.connection.outcome.text}
      </Alert>
    {/if}
  </form>

  {#snippet footer(close)}
    <Button disabled={view.saving} onclick={close}>Cancel</Button>
    <Button
      variant="outline"
      loading={testing}
      disabled={testing || view.saving}
      onclick={() => view.test()}
    >
      Test connection
    </Button>
    <Button variant="primary" type="submit" form={formId} disabled={view.saving || testing}>
      {view.saving ? 'Saving…' : 'Save'}
    </Button>
  {/snippet}
</Modal>
