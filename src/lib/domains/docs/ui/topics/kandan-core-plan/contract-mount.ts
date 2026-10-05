import { flushSync, mount, unmount } from 'svelte';
import type { ComponentRenderer } from './contract-cases';

const mountedMarkup: ComponentRenderer = (component, props) => {
  const target = document.createElement('div');
  const instance = mount(component, { target, props });
  flushSync();
  const markup = target.innerHTML;
  void unmount(instance);
  return markup;
};

export { mountedMarkup };
