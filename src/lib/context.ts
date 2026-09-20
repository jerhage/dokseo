import { getContext, setContext } from 'svelte';
import type { Container } from './container';

const CONTAINER = Symbol('container');

function provideContainer(container: Container): void {
  setContext(CONTAINER, container);
}

function useContainer(): Container {
  const container = getContext<Container | undefined>(CONTAINER);
  if (container === undefined) {
    throw new Error('No container in context. Call provideContainer() in the root layout first.');
  }
  return container;
}

export { provideContainer, useContainer };
