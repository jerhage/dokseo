<script lang="ts">
  import CodeBlock from '$lib/ui/components/CodeBlock.svelte';
  import { SYSTEM_CLOCK } from '$lib/ui/components/clock';
  import { CopyFeedback } from './copy-feedback.svelte';

  type Props = {
    code: string;
    label: string;
  };

  let { code, label }: Props = $props();

  const feedback = new CopyFeedback((text) => navigator.clipboard.writeText(text), SYSTEM_CLOCK);
</script>

<CodeBlock {code} {label} oncopy={(text) => void feedback.copy(text)} copied={feedback.copied} />
