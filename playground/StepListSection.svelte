<script lang="ts">
  import Card from '../components/Card.svelte';
  import StepItem from '../components/StepItem.svelte';
  import StepList from '../components/StepList.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="step-list"
  title="Step list"
  classes={[
    'step-list',
    'step-list-item',
    'step-list-content',
    'step-list-title',
    'step-list-body',
  ]}
>
  <Card>
    <StepList>
      <StepItem title="Request the page"
        >The server answers with the document and its headers.</StepItem
      >
      <StepItem title="Check the headers">
        The browser compares the opener and embedder policies before it runs a script.
      </StepItem>
      <StepItem title="Run isolated" />
    </StepList>
  </Card>
</DemoSection>
