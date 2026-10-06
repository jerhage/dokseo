<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import IconButton from '../components/IconButton.svelte';
  import Search from '../components/icons/Search.svelte';
  import Tooltip from '../components/Tooltip.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection id="tooltip" title="Tooltip" classes={['tooltip']}>
  <Card>
    <p class="text-sm text-muted">
      A short description beside its trigger. It shows after the pointer rests on the trigger, or at
      once when the trigger takes focus, and hides on Escape, on leaving and on blur. The pointer
      can move onto it without hiding it.
    </p>
    <div class="row wrap items-center gap-3">
      <Tooltip text="Save the changes to this page">
        {#snippet trigger(props)}<Button {...props}>Save</Button>{/snippet}
      </Tooltip>
      <Tooltip text="Search every book in the library, by title, author or text">
        {#snippet trigger(props)}
          <IconButton variant="ghost" label="Search" tooltip={false} {...props}>
            <Search />
          </IconButton>
        {/snippet}
      </Tooltip>
      <Tooltip text="A link can carry a tooltip too">
        {#snippet trigger(props)}<a href="#tooltip" {...props}>A described link</a>{/snippet}
      </Tooltip>
    </div>
  </Card>
</DemoSection>
