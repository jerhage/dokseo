<script lang="ts">
  import Progress from '$lib/components/Progress.svelte';
  import type { Language } from '$lib/shared/language';
  import type { UploadStage } from '../../../domain/ingest/upload-progress';
  import { uploadCountText, uploadStageText } from '../../upload-progress-text';
  import './pending-card.css';

  type Props = {
    readonly title: string;
    readonly language: Language;
    readonly stage: UploadStage;
  };

  let { title, language, stage }: Props = $props();

  const count = $derived(uploadCountText(stage));
  const detail = $derived(uploadStageText(stage));
</script>

<article class="pending-card col gap-2" aria-live="polite">
  <div class="cover surface-sunken bordered rounded-container col items-center justify-center p-3">
    <Progress label="Importing {title}" size="sm" />
    <span class="col items-center gap-1">
      <span class="text-xs uppercase tracking-wide text-muted">Importing</span>
      {#if count !== null}<span class="text-sm">{count}</span>{/if}
    </span>
  </div>
  <h3 class="title text-sm truncate" lang={language}>{title}</h3>
  <p class="text-xs text-muted">{detail}</p>
</article>
