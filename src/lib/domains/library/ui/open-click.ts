import type { Attachment } from 'svelte/attachments';

const OWN_CONTROLS = 'a, button, input, label, select, textarea';

function openClick(onclick: () => void): Attachment<HTMLElement> {
  return (element) => {
    const listener = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Element) {
        const control = target.closest(OWN_CONTROLS);
        if (control !== null && element.contains(control)) return;
      }
      onclick();
    };
    element.addEventListener('click', listener);
    return () => element.removeEventListener('click', listener);
  };
}

export { openClick };
