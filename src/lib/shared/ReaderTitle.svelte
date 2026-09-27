<script lang="ts">
  type Props = {
    title: string;
    lang: string;
    meta: string;
  };

  let { title, lang, meta }: Props = $props();
</script>

<div class="col gap-0 flex-1">
  <h1 class="text-base weight-medium truncate" {lang}>{title}</h1>
  <p class="text-xs text-faint truncate">{meta}</p>
</div>
