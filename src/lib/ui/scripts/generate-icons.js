import { writeFileSync } from 'node:fs';
import { iconComponents } from './icon-components.js';

const SOURCES = new URL('../core/icons/', import.meta.url);

const COMPONENTS = new URL('../components/icons/', import.meta.url);

for (const { file, source } of iconComponents(SOURCES)) {
  writeFileSync(new URL(file, COMPONENTS), source);
}
