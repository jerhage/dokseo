<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import Input from '../components/Input.svelte';
  import InputGroup from '../components/InputGroup.svelte';
  import InputGroupAddon from '../components/InputGroupAddon.svelte';
  import Search from '../components/icons/Search.svelte';
  import DemoSection from './DemoSection.svelte';

  let email = $state('');
  let weight = $state('');

  const weightError = $derived(
    weight === '' || /^\d+(\.\d+)?$/u.test(weight) ? undefined : 'Enter a number.',
  );
</script>

<DemoSection
  id="input-group"
  title="Input group"
  classes={['input-group', 'input-group-addon', 'input-group-addon-icon']}
>
  <p class="text-sm text-muted">
    An input joined to the addons before and after it: text, a glyph or a button. A field still
    labels the input.
  </p>
  <Card>
    <div class="grid-2 gap-5">
      <Field label="Email">
        {#snippet children(control)}
          <InputGroup>
            <Input {...control} type="email" bind:value={email} placeholder="you@example.com" />
            <Button variant="primary">Subscribe</Button>
          </InputGroup>
        {/snippet}
      </Field>
      <Field label="Invite link">
        {#snippet children(control)}
          <InputGroup>
            <Input {...control} value="https://example.com/invite/8f2k" readonly />
            <Button>Copy</Button>
          </InputGroup>
        {/snippet}
      </Field>
      <Field label="Site address">
        {#snippet children(control)}
          <InputGroup>
            <InputGroupAddon>https://</InputGroupAddon>
            <Input {...control} placeholder="example.com" />
          </InputGroup>
        {/snippet}
      </Field>
      <Field label="Weight" hint="In kilograms." error={weightError}>
        {#snippet children(control)}
          <InputGroup>
            <Input {...control} inputmode="decimal" bind:value={weight} />
            <InputGroupAddon>kg</InputGroupAddon>
          </InputGroup>
        {/snippet}
      </Field>
      <Field label="Filter the list">
        {#snippet children(control)}
          <InputGroup>
            <InputGroupAddon icon={Search} />
            <Input {...control} placeholder="Names or tags" />
            <Button>Apply</Button>
          </InputGroup>
        {/snippet}
      </Field>
      <Field label="Disabled">
        {#snippet children(control)}
          <InputGroup>
            <InputGroupAddon>@</InputGroupAddon>
            <Input {...control} value="unavailable" disabled />
            <Button disabled>Check</Button>
          </InputGroup>
        {/snippet}
      </Field>
    </div>
  </Card>
</DemoSection>
