<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import AvatarStack from '$lib/components/AvatarStack.svelte';
  import Card from '$lib/components/Card.svelte';
  import favicon from '$lib/assets/favicon.svg';
  import type { ControlSize } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  const SIZES: readonly ControlSize[] = ['sm', 'md', 'lg'];
</script>

<DemoSection
  id="avatar"
  title="Avatar"
  classes={['avatar', 'avatar-sm', 'avatar-lg', 'avatar-square', 'avatar-accent', 'avatar-stack']}
>
  <Card>
    <div class="row wrap items-center gap-3">
      {#each SIZES as size (size)}
        <Avatar {size}>AL</Avatar>
      {/each}
      {#each SIZES as size (size)}
        <Avatar {size} variant="accent">GH</Avatar>
      {/each}
      {#each SIZES as size (size)}
        <Avatar {size} shape="square">MN</Avatar>
      {/each}
      <Avatar src={favicon} alt="Favicon" />
    </div>
    <div class="row wrap items-center gap-6">
      <AvatarStack label="7 members" overflow={4}>
        <Avatar>AL</Avatar>
        <Avatar variant="accent">GH</Avatar>
        <Avatar>KJ</Avatar>
      </AvatarStack>
      <AvatarStack label="2 members">
        <Avatar size="sm">AL</Avatar>
        <Avatar size="sm" variant="accent">GH</Avatar>
      </AvatarStack>
    </div>
  </Card>
</DemoSection>
