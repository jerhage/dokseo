import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

function load(): void {
  if (!dev) error(404, 'Not found');
}

export { load };
