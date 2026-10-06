<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Divider from '../components/Divider.svelte';
  import Field from '../components/Field.svelte';
  import Input from '../components/Input.svelte';
  import Modal from '../components/Modal.svelte';
  import SearchField from '../components/SearchField.svelte';
  import type { ModalSize, StatusVariant } from '../components/classes';
  import { getToaster } from '../components/toast-context';
  import type { ToastOptions } from '../components/toaster.svelte';
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
  let bare = $state(false);
  let layered = $state(false);
  let asking = $state(false);
  let barred = $state(false);
  let sheeted = $state(false);
  let filter = $state('');

  function removed(): void {
    toaster.show({
      variant: 'success',
      title: 'Book removed',
      message: 'Stays until you act or close it.',
      action: { label: 'Undo', run: () => toaster.show({ title: 'Book restored' }) },
    });
  }

  function toastThenModal(): void {
    toaster.show({ title: 'Shown before the modal', duration: 'persistent' });
    layered = true;
  }

  function deleted(): void {
    toaster.show({ variant: 'danger', title: 'Workspace deleted', message: confirmation });
  }
</script>

<DemoSection
  id="modal"
  title="Modal and toast"
  classes={[
    'modal',
    'modal-sm',
    'modal-lg',
    'modal-header-bar',
    'modal-footer-info',
    'modal-sheet',
    'toast',
  ]}
>
  <Card>
    <span class="eyebrow text-faint weight-semibold">Modal</span>
    <div class="row wrap items-center gap-3">
      <Button variant="danger" onclick={() => (deleting = true)}>Delete workspace</Button>
      {#each SIZES as size (size)}
        <Button onclick={() => (sized = size)}>Open {size}</Button>
      {/each}
      <Button onclick={() => (bare = true)}>Headerless</Button>
      <Button onclick={() => (asking = true)}>No close button</Button>
      <Button onclick={() => (barred = true)}>Header bar</Button>
      <Button onclick={() => (sheeted = true)}>Sheet on a narrow screen</Button>
    </div>
    <p class="text-sm text-muted">Last closed: {closedBy}</p>
  </Card>
  <Card>
    <span class="eyebrow text-faint weight-semibold">Toast</span>
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
    <Divider />
    <div class="row wrap items-center gap-3">
      <Button onclick={removed}>With an action</Button>
      <Button onclick={toastThenModal}>Toast, then a modal</Button>
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

<Modal
  bind:open={bare}
  aria-label="Keyboard shortcuts"
  size="sm"
  infoFooter
  onclose={() => (closedBy = 'the headerless modal')}
>
  <p>No title row and no close button. Its name comes from aria-label.</p>
  <p>Close with Escape or a click on the backdrop.</p>
  {#snippet footer()}
    <span>2 shortcuts</span>
    <span>esc close</span>
  {/snippet}
</Modal>

<Modal
  bind:open={asking}
  title="Download the sample files?"
  closeButton={false}
  size="sm"
  onclose={() => (closedBy = 'the modal without a close button')}
>
  <p>
    A title row with no close button, for a question the footer answers. Escape still closes it.
  </p>
  {#snippet footer(close)}
    <Button onclick={close}>Not now</Button>
    <Button variant="primary" onclick={close}>Download</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={barred}
  aria-label="Filter the files"
  size="md"
  flushBody
  onclose={() => (closedBy = 'the header bar modal')}
>
  {#snippet header(close)}
    <SearchField
      bind:value={filter}
      label="Filter the files"
      hideLabel
      class="flex-fill"
      placeholder="Filter the files"
    />
    <Button variant="ghost" onclick={close}>Cancel</Button>
  {/snippet}
  <p class="px-5 py-5 text-sm text-muted">
    The header snippet sits in a compact bar that wraps: a field and its controls, no title.
  </p>
</Modal>

<Modal
  bind:open={sheeted}
  title="Sort the shelf"
  sheetNarrow
  onclose={() => (closedBy = 'the sheet modal')}
>
  <p>
    Below the narrow breakpoint this modal docks to the bottom edge and slides up from it; above it,
    it stays centred. Narrow the window to see it change, even while it is open.
  </p>
  {#snippet footer(close)}
    <Button variant="primary" onclick={close}>Done</Button>
  {/snippet}
</Modal>

<Modal bind:open={layered} title="Toasts stay on top" size="sm">
  <p>A toast shown now, or one shown before this opened, sits above the modal and takes clicks.</p>
  {#snippet footer(close)}
    <Button onclick={removed}>Show a toast</Button>
    <Button variant="primary" onclick={close}>Done</Button>
  {/snippet}
</Modal>
