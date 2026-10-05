<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Card from '$lib/ui/components/Card.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Tag from '$lib/ui/components/Tag.svelte';
</script>

<Card>
  {#snippet eyebrow()}Reading{/snippet}
  {#snippet title()}Volume 3{/snippet}
  {#snippet description()}Chapter 14, page 212 of 238.{/snippet}
  <Progress label="Read so far" value={89} />
  <div class="row wrap gap-2">
    <Badge variant="success" dot>Saved</Badge>
    <Badge variant="accent">Vertical</Badge>
    <Tag color="sky">Favorites</Tag>
  </div>
  {#snippet footer()}
    <Button variant="primary" size="sm">Continue</Button>
    <Button variant="ghost" size="sm">Details</Button>
  {/snippet}
</Card>
