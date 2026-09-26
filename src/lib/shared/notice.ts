type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

type NoticeAction = {
  readonly label: string;
  readonly run: () => void;
};

type Notice = {
  readonly tone: NoticeTone;
  readonly title: string;
  readonly message?: string;
  readonly action?: NoticeAction;
  readonly duration?: number;
};

type Notify = (notice: Notice) => void;

const ACTION_NOTICE_MS = 10_000;

export { ACTION_NOTICE_MS };
export type { Notice, NoticeAction, NoticeTone, Notify };
