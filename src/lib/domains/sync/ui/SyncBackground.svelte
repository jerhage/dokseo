<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { watchLocalChanges } from '$lib/platform/events/local-change';
  import { holdingLockIfFree } from '$lib/platform/locks/web-locks';
  import type { Notify } from '$lib/shared/notice';
  import { logUnexpected } from '$lib/shared/unexpected-failure';
  import { syncKeys } from '../queries/sync-keys';
  import type { SyncNowResult } from '../use-cases/sync-now';
  import type { BackgroundSyncUseCases, DownloadChoiceSource } from './sync-deps';
  import { SYNC_LOCK_NAME } from './sync-schedule';
  import { SyncScheduler } from './sync-scheduler';
  import {
    OPEN_SYNC_SETTINGS_LABEL,
    SIGNED_OUT_NOTICE_TEXT,
    SIGNED_OUT_NOTICE_TITLE,
  } from './sync-texts';

  type Props = {
    readonly sync: BackgroundSyncUseCases;
    readonly choices: DownloadChoiceSource;
    readonly notify: Notify;
    readonly onsynced: () => void;
  };

  let { sync, choices, notify, onsynced }: Props = $props();

  const client = useQueryClient();

  const scheduler = new SyncScheduler({
    isConnected: async () => (await sync.syncStatus()).kind === 'connected',
    isOnline: () => navigator.onLine,
    exclusively: (work) => holdingLockIfFree(SYNC_LOCK_NAME, work),
    sync: (): Promise<SyncNowResult> =>
      sync.syncNow({ matching: choices.matching(), defaults: choices.defaults() }),
    synced: () => {
      void client.invalidateQueries({ queryKey: syncKeys.all() });
      onsynced();
    },
    signedOut: () =>
      notify({
        tone: 'warning',
        title: SIGNED_OUT_NOTICE_TITLE,
        message: SIGNED_OUT_NOTICE_TEXT,
        action: { label: OPEN_SYNC_SETTINGS_LABEL, run: () => void goto('/settings/sync') },
      }),
    failed: (cause) => logUnexpected('promise', cause),
    watchChanges: watchLocalChanges,
    startTimer: (callback, delayMs) => {
      const handle = setTimeout(callback, delayMs);
      return () => clearTimeout(handle);
    },
  });

  onMount(() => {
    scheduler.start();
    return () => scheduler.stop();
  });
</script>

<svelte:document onvisibilitychange={() => scheduler.visibilityChanged(document.visibilityState)} />
