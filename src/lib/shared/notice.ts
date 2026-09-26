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
};

type Notify = (notice: Notice) => void;

export type { Notice, NoticeAction, NoticeTone, Notify };
