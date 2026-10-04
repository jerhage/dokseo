import { handlerAnswer } from '../../../domain/paging-keys';
import type {
  HandlerAnswer,
  PagingFocus,
  PagingHandler,
  PagingKey,
} from '../../../domain/paging-keys';

type PagingEntry = {
  readonly id: number;
  readonly key: PagingKey;
  readonly focus: PagingFocus;
  readonly answer: HandlerAnswer;
  readonly handlerTurn: number;
  readonly buttonTurn: number;
  readonly contentsOpened: boolean;
};

type PagingButton = 'next' | 'contents';

type PagingVerdict = 'double-turn' | 'turned-and-pressed' | 'dead-key' | 'as-expected';

const FIRST_PAGE = 1;

const LAST_PAGE = 60;

const KEPT_ENTRIES = 8;

function pagingVerdict(entry: PagingEntry): PagingVerdict {
  if (entry.answer.kind === 'turn' && entry.buttonTurn !== 0) return 'double-turn';
  if (entry.answer.kind === 'turn' && entry.contentsOpened) return 'turned-and-pressed';
  if (entry.key !== ' ' && entry.answer.kind === 'leave' && entry.focus !== 'text-field') {
    return 'dead-key';
  }
  return 'as-expected';
}

class KeyboardPaging {
  handler = $state<PagingHandler>('every-key');
  page = $state(FIRST_PAGE);
  contentsOpen = $state(false);
  entries = $state<readonly PagingEntry[]>([]);
  #next = 1;
  #current: number | null = null;

  pressed(key: PagingKey, focus: PagingFocus): HandlerAnswer {
    const answer = handlerAnswer(this.handler, key, focus);
    const handlerTurn = answer.kind === 'turn' ? this.#turn(answer.by) : 0;
    const entry: PagingEntry = {
      id: this.#next,
      key,
      focus,
      answer,
      handlerTurn,
      buttonTurn: 0,
      contentsOpened: false,
    };
    this.#next += 1;
    this.#current = entry.id;
    this.entries = [entry, ...this.entries].slice(0, KEPT_ENTRIES);
    return answer;
  }

  clicked(button: PagingButton, fromKeyboard: boolean): void {
    const buttonTurn = button === 'next' ? this.#turn(1) : 0;
    if (button === 'contents') this.contentsOpen = !this.contentsOpen;
    const current = this.#current;
    if (!fromKeyboard || current === null) return;
    this.entries = this.entries.map((entry) =>
      entry.id === current
        ? {
            ...entry,
            buttonTurn: entry.buttonTurn + buttonTurn,
            contentsOpened: entry.contentsOpened || button === 'contents',
          }
        : entry,
    );
  }

  released(): void {
    this.#current = null;
  }

  reset(): void {
    this.page = FIRST_PAGE;
    this.contentsOpen = false;
    this.entries = [];
    this.#current = null;
  }

  #turn(by: number): number {
    const before = this.page;
    this.page = Math.min(LAST_PAGE, Math.max(FIRST_PAGE, before + by));
    return this.page - before;
  }
}

export { FIRST_PAGE, KeyboardPaging, LAST_PAGE, pagingVerdict };
export type { PagingButton, PagingEntry, PagingVerdict };
