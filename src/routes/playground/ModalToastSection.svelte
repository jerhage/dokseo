<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { ModalSize, StatusVariant } from '$lib/components/classes';
  import { getToaster } from '$lib/components/toast-context';
  import type { ToastOptions } from '$lib/components/toaster.svelte';
  import DemoSection from './DemoSection.svelte';

  type ToastDemo = ToastOptions & { readonly variant: StatusVariant; readonly button: string };

  const TOASTS: readonly ToastDemo[] = [
    { variant: 'success', button: 'Success', title: 'Saved', message: 'All changes are synced.' },
    {
      variant: 'warning',
      button: 'Warning',
      title: 'Almost out of seats',
      message: '2 of 25 remaining.',
    },
    {
      variant: 'danger',
      button: 'Danger',
      title: 'Upload failed',
      message: 'The file exceeds 50 MB.',
    },
    { variant: 'info', button: 'Info', title: 'New version', message: 'Refresh to update.' },
  ];

  const SIZES: readonly ModalSize[] = ['sm', 'md', 'lg'];

  const toaster = getToaster();

  let deleting = $state(false);
  let sized = $state<ModalSize | undefined>();
  let confirmation = $state('');
  let closedBy = $state('nothing yet');

  function deleted(): void {
    toaster.show({ variant: 'danger', title: 'Workspace deleted', message: confirmation });
  }
</script>

<DemoSection
  id="modal"
  title="Modal and toast"
  classes={['modal', 'modal-sm', 'modal-lg', 'toast']}
>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Modal</span>
    <div class="row wrap items-center gap-3">
      <Button variant="danger" onclick={() => (deleting = true)}>Delete workspace</Button>
      {#each SIZES as size (size)}
        <Button onclick={() => (sized = size)}>Open {size}</Button>
      {/each}
    </div>
    <p class="text-sm text-muted">Last closed: {closedBy}</p>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Toast</span>
    <div class="row wrap items-center gap-3">
      {#each TOASTS as toast (toast.variant)}
        <Button onclick={() => toaster.show(toast)}>{toast.button}</Button>
      {/each}
    </div>
    <Divider />
    <div class="row wrap items-center gap-3">
      <Button onclick={() => toaster.show({ title: 'Two seconds', duration: 2000 })}>
        2 s timeout
      </Button>
      <Button
        onclick={() =>
          toaster.show({ variant: 'warning', title: 'Stays until closed', duration: 'persistent' })}
      >
        Persistent
      </Button>
      <Button onclick={() => toaster.show({ title: 'Title only' })}>Title only</Button>
    </div>
  </Card>
</DemoSection>

<Modal
  bind:open={deleting}
  title="Delete workspace?"
  size="sm"
  onclose={() => (closedBy = 'the delete dialog')}
>
  <div class="stack-md">
    <p>
      This permanently removes the workspace, its 42 projects and all member access. This cannot be
      undone.
    </p>
    <Field label="Type the workspace name to confirm">
      {#snippet children(control)}
        <Input {...control} placeholder="northwind" bind:value={confirmation} />
      {/snippet}
    </Field>
  </div>
  {#snippet footer(close)}
    <Button variant="ghost" onclick={close}>Cancel</Button>
    <Button
      variant="danger"
      disabled={confirmation !== 'northwind'}
      onclick={() => {
        deleted();
        close();
      }}>Delete workspace</Button
    >
  {/snippet}
</Modal>

{#each SIZES as size (size)}
  <Modal
    open={sized === size}
    title="A {size} modal"
    {size}
    onclose={() => {
      sized = undefined;
      closedBy = `the ${size} modal`;
    }}
  >
    <p>Close with the button, Escape, or a click on the backdrop.</p>
    {#snippet footer(close)}
      <Button variant="primary" onclick={close}>Done</Button>
    {/snippet}
  </Modal>
{/each}
