import type { Toaster, ToastOptions } from '$lib/ui/components/toaster.svelte';
import type { Notice, Notify } from './notice';

function noticeToast(notice: Notice): ToastOptions {
  return {
    variant: notice.tone,
    title: notice.title,
    ...(notice.message === undefined ? {} : { message: notice.message }),
    ...(notice.action === undefined ? {} : { action: notice.action }),
    ...(notice.duration === undefined ? {} : { duration: notice.duration }),
  };
}

function toastNotify(toaster: Pick<Toaster, 'show'>): Notify {
  return (notice) => {
    toaster.show(noticeToast(notice));
  };
}

export { noticeToast, toastNotify };
