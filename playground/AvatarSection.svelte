<script lang="ts">
  import Avatar from '../components/Avatar.svelte';
  import AvatarStack from '../components/AvatarStack.svelte';
  import Card from '../components/Card.svelte';
  import type { ControlSize } from '../components/classes';
  import DemoSection from './DemoSection.svelte';
  import sampleAvatar from './sample-avatar.svg';

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
      <Avatar src={sampleAvatar} alt="Sample portrait" />
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
