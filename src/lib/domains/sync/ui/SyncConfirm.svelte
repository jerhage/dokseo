<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';

  type Props = {
    readonly title: string;
    readonly body: string;
    readonly confirmLabel: string;
    readonly busyLabel: string;
    readonly busy: boolean;
    readonly onconfirm: () => void;
    readonly ondismiss: () => void;
  };

  let { title, body, confirmLabel, busyLabel, busy, onconfirm, ondismiss }: Props = $props();

  let open = $state(true);

  function requestOpen(next: boolean): void {
    if (busy) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} {title} size="sm" onclose={ondismiss}>
  <p class="text-sm">{body}</p>

  {#snippet footer(close)}
    <Button disabled={busy} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={busy} onclick={onconfirm}>
      {busy ? busyLabel : confirmLabel}
    </Button>
  {/snippet}
</Modal>
