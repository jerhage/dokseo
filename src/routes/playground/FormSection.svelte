<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import DemoSection from './DemoSection.svelte';

  let email = $state('ada@');
  let role = $state('design');
  let projectField = $state<HTMLInputElement>();

  const emailError = $derived(
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email) ? undefined : 'Enter a complete email address.',
  );
</script>

<DemoSection
  id="form"
  title="Form field"
  classes={['field', 'input', 'select', 'textarea', 'is-invalid']}
>
  <Card>
    <div class="row">
      <Button size="sm" onclick={() => projectField?.focus()}>Focus the project name</Button>
      <span class="text-xs text-faint">bind:ref hands the caller the element</span>
    </div>
    <div class="grid-2 gap-5">
      <Field label="Project name" hint="Shown in the header of every page.">
        {#snippet children(control)}
          <Input {...control} bind:ref={projectField} placeholder="e.g. Northwind" />
        {/snippet}
      </Field>
      <Field label="Email" hint="A complete address clears the error." error={emailError}>
        {#snippet children(control)}
          <Input {...control} type="email" bind:value={email} />
        {/snippet}
      </Field>
      <Field label="Role">
        {#snippet children(control)}
          <Select {...control} bind:value={role}>
            <option value="design">Designer</option>
            <option value="eng">Engineer</option>
            <option value="pm">Product manager</option>
          </Select>
        {/snippet}
      </Field>
      <Field label="Workspace ID" hint="Assigned automatically.">
        {#snippet children(control)}
          <Input {...control} value="ws_8f2k1" disabled />
        {/snippet}
      </Field>
      <Field label="Read only">
        {#snippet children(control)}
          <Input {...control} value="Cannot be edited" readonly />
        {/snippet}
      </Field>
      <Field label="Disabled select">
        {#snippet children(control)}
          <Select {...control} disabled>
            <option>Unavailable</option>
          </Select>
        {/snippet}
      </Field>
      <Field label="Notes" class="col-span-full">
        {#snippet children(control)}
          <Textarea {...control} rows={3} placeholder="Anything the team should know" />
        {/snippet}
      </Field>
      <Field label="Disabled notes" error="An error on a textarea." class="col-span-full">
        {#snippet children(control)}
          <Textarea {...control} rows={2} value="Locked" disabled />
        {/snippet}
      </Field>
    </div>
  </Card>
</DemoSection>
