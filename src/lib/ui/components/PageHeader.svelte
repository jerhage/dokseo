<script lang="ts">
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import ChevronLeft from './icons/ChevronLeft.svelte';

  type Props = {
    title: string;
    lang?: string | undefined;
    meta?: string | undefined;
    backHref?: string | undefined;
    backLabel?: string;
    compact?: boolean;
  };

  let { title, lang, meta, backHref, backLabel = 'Back', compact = false }: Props = $props();
</script>

<div class="page-header">
  {#if backHref !== undefined}
    {#if compact}
      <IconButton
        href={backHref}
        size="sm"
        class="shrink-0"
        icon={ChevronLeft}
        label={backLabel}
        tooltip={false}
      />
    {:else}
      <Button href={backHref} size="sm" class="shrink-0">
        <ChevronLeft class="btn-icon" />
        {backLabel}
      </Button>
    {/if}
  {/if}

  <div class="col gap-0 flex-1">
    <h1 class="text-base weight-medium truncate" {lang}>{title}</h1>
    {#if meta !== undefined}
      <p class="text-xs text-faint truncate">{meta}</p>
    {/if}
  </div>
</div>
