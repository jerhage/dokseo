<script lang="ts">
  import { untrack } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Checkbox from '$lib/ui/components/Checkbox.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { Catalog } from '../domain/catalog';
  import {
    REMEMBER_PASSWORD_HINT,
    REMEMBER_PASSWORD_LABEL,
    REMEMBER_PASSWORD_WARNING,
    UNAUTHORIZED_TEXT,
    passwordHint,
  } from './catalog-texts';

  type Props = {
    readonly catalog: Catalog;
    readonly refused: boolean;
    readonly remembered: boolean;
    readonly onunlock: (password: string, remember: boolean) => void;
    readonly ondismiss: () => void;
  };

  let { catalog, refused, remembered, onunlock, ondismiss }: Props = $props();

  const uid = $props.id();
  const formId = `${uid}-form`;

  let open = $state(true);
  let password = $state('');
  let remember = $state(untrack(() => remembered));

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (password === '') return;
    onunlock(password, remember);
  }
</script>

<Modal bind:open title="Password for {catalog.title}" size="sm" sheetNarrow onclose={ondismiss}>
  <form id={formId} class="stack-md" onsubmit={submit}>
    {#if refused}
      <Alert variant="warning" aria-live="polite">{UNAUTHORIZED_TEXT}</Alert>
    {/if}
    {#if catalog.auth.kind === 'basic'}
      {@const username = catalog.auth.username}
      <Field label="Username">
        {#snippet children(control)}
          <Input
            {...control}
            name="username"
            type="text"
            autocomplete="username"
            readonly
            value={username}
          />
        {/snippet}
      </Field>
    {/if}
    <Field label="Password" hint={passwordHint(remember)}>
      {#snippet children(control)}
        <Input
          {...control}
          name="password"
          type="password"
          autocomplete="current-password"
          bind:value={password}
        />
      {/snippet}
    </Field>
    <Checkbox bind:checked={remember} hint={REMEMBER_PASSWORD_HINT}>
      {REMEMBER_PASSWORD_LABEL}
    </Checkbox>
    {#if remember}
      <Alert variant="warning">{REMEMBER_PASSWORD_WARNING}</Alert>
    {/if}
  </form>

  {#snippet footer(close)}
    <Button onclick={close}>Cancel</Button>
    <Button variant="primary" type="submit" form={formId} disabled={password === ''}>Unlock</Button>
  {/snippet}
</Modal>
