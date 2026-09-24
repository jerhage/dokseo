<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="card"
  title="Card"
  classes={['card', 'card-elevated', 'card-feature', 'card-interactive', 'card-media']}
>
  <div class="grid-4">
    <Card>
      {#snippet eyebrow()}Default{/snippet}
      {#snippet title()}Quarterly review{/snippet}
      {#snippet description()}Summaries, owners and next steps collected in one place.{/snippet}
      {#snippet footer()}<Badge variant="success" dot>On track</Badge>{/snippet}
    </Card>
    <Card variant="elevated">
      {#snippet eyebrow()}Elevated{/snippet}
      {#snippet title()}Usage this month{/snippet}
      {#snippet description()}Seats in use across all workspaces.{/snippet}
      <Progress label="Seats in use" value={72} />
    </Card>
    <Card variant="feature">
      {#snippet eyebrow()}Feature{/snippet}
      {#snippet title()}Upgrade to Team{/snippet}
      {#snippet description()}Shared libraries, roles and audit history.{/snippet}
      {#snippet footer()}
        <Button variant="primary" size="sm">Upgrade</Button>
        <Button variant="ghost" size="sm">Compare plans</Button>
      {/snippet}
    </Card>
    <Card href="#card">
      {#snippet eyebrow()}Interactive{/snippet}
      {#snippet title()}Open changelog{/snippet}
      {#snippet description()}Hover to lift. The whole card is the link target.{/snippet}
    </Card>
    <Card>
      {#snippet media()}{/snippet}
      {#snippet eyebrow()}With media{/snippet}
      {#snippet title()}A media slot{/snippet}
      {#snippet description()}The media area keeps a 16 by 9 frame.{/snippet}
    </Card>
    <Card mediaRatio="square">
      {#snippet media()}{/snippet}
      {#snippet title()}Square media{/snippet}
      {#snippet description()}mediaRatio="square" maps to .aspect-square.{/snippet}
    </Card>
    <Card mediaRatio="portrait">
      {#snippet media()}{/snippet}
      {#snippet title()}Portrait media{/snippet}
      {#snippet description()}mediaRatio="portrait" maps to .aspect-portrait.{/snippet}
    </Card>
    <Card heading="h4">
      {#snippet title()}Body only{/snippet}
      <p class="text-sm">Free content goes in the body after the title.</p>
    </Card>
  </div>
</DemoSection>
