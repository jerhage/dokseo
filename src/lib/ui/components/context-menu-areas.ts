import type { Attachment } from 'svelte/attachments';

type AreaListener<T> = {
  readonly contextmenu: (event: MouseEvent, value: T) => void;
  readonly keydown: (event: KeyboardEvent, value: T) => void;
};

class ContextMenuAreas<T> {
  #listener: AreaListener<T> | undefined;

  area(value: T): Attachment<HTMLElement> {
    return (element) => {
      const contextmenu = (event: MouseEvent): void => this.#listener?.contextmenu(event, value);
      const keydown = (event: KeyboardEvent): void => this.#listener?.keydown(event, value);
      element.addEventListener('contextmenu', contextmenu);
      element.addEventListener('keydown', keydown);
      return () => {
        element.removeEventListener('contextmenu', contextmenu);
        element.removeEventListener('keydown', keydown);
      };
    };
  }

  listen(listener: AreaListener<T>): () => void {
    this.#listener = listener;
    return () => {
      if (this.#listener === listener) this.#listener = undefined;
    };
  }
}

function createContextMenuAreas<T>(): ContextMenuAreas<T> {
  return new ContextMenuAreas<T>();
}

export { ContextMenuAreas, createContextMenuAreas };
export type { AreaListener };
