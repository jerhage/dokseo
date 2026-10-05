<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import Input from '../components/Input.svelte';
  import Select from '../components/Select.svelte';
  import Textarea from '../components/Textarea.svelte';
  import DemoSection from './DemoSection.svelte';

  let email = $state('ada@');
  let role = $state('design');
  let projectField = $state<HTMLInputElement | null>();
  let rename = $state('');
  let displayName = $state('Ada Lovelace');
  let timeZone = $state('utc');

  const emailError = $derived(
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email) ? undefined : 'Enter a complete email address.',
  );

  const renameError = $derived(rename.trim() === '' ? 'A name is needed.' : undefined);
</script>

<DemoSection
  id="form"
  title="Form field"
  classes={['field', 'field-inline', 'input', 'select', 'textarea', 'is-invalid']}
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
      <Field
        label="Rename the workspace"
        hideLabel
        error={renameError}
        announceError
        class="col-span-full"
      >
        {#snippet children(control)}
          <Input {...control} bind:value={rename} placeholder="hideLabel and announceError" />
        {/snippet}
      </Field>
    </div>
  </Card>
  <Card>
    <span class="eyebrow text-faint weight-semibold">Inline layout</span>
    <div class="stack-md">
      <Field label="Display name" layout="inline">
        {#snippet children(control)}
          <Input {...control} bind:value={displayName} />
        {/snippet}
      </Field>
      <Field label="Time zone" layout="inline" hint="The label wraps above when the row is tight.">
        {#snippet children(control)}
          <Select {...control} bind:value={timeZone}>
            <option value="utc">UTC</option>
            <option value="cet">CET</option>
            <option value="pst">PST</option>
          </Select>
        {/snippet}
      </Field>
      <Field
        label="Display name, required"
        layout="inline"
        error={displayName.trim() === '' ? 'A name is needed.' : undefined}
      >
        {#snippet children(control)}
          <Input {...control} bind:value={displayName} />
        {/snippet}
      </Field>
    </div>
  </Card>
</DemoSection>
