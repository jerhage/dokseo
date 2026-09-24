<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import type { Language } from '$lib/shared/language';
  import { uploadFraction } from '../../../domain/ingest/upload-progress';
  import type { UploadStage } from '../../../domain/ingest/upload-progress';
  import { uploadCountText, uploadStageText } from '../../upload-progress-text';

  type Props = {
    readonly title: string;
    readonly language: Language;
    readonly stage: UploadStage;
  };

  let { title, language, stage }: Props = $props();

  const count = $derived(uploadCountText(stage));
  const detail = $derived(uploadStageText(stage));
  const fraction = $derived(uploadFraction(stage));
</script>

<section
  class="col gap-2 p-4 surface bordered rounded-container"
  aria-label="Importing {title}"
  aria-live="polite"
>
  <div class="row wrap items-center gap-2">
    <Badge variant="brand" dot>Importing</Badge>
    <span class="flex-1 text-sm weight-medium truncate" lang={language}>{title}</span>
    {#if count !== null}<span class="text-xs mono text-muted">{count}</span>{/if}
  </div>
  <Progress
    label="Importing {title}"
    value={fraction === null ? undefined : fraction * 100}
    size="sm"
  />
  <p class="text-xs text-muted">{detail}</p>
</section>
