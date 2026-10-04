import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCS_TOPICS, docsIndexEntries, docsTopic, docsTopicHref } from './topics';
import type { DocsTopic } from './topics';

const DOCS_ROUTES = join('src', 'routes', 'docs');

function topicRoutes(): readonly string[] {
  return readdirSync(DOCS_ROUTES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
}

const written: DocsTopic = {
  slug: 'written',
  title: 'Written',
  summary: 'A page that exists.',
  status: 'published',
};

const coming: DocsTopic = {
  slug: 'coming',
  title: 'Coming',
  summary: 'A page not yet written.',
  status: 'planned',
};

describe('docsIndexEntries', () => {
  it('links a published topic to its page and lists a planned one as coming, in order', () => {
    expect(docsIndexEntries([coming, written])).toEqual([
      { kind: 'coming', topic: coming },
      { kind: 'link', topic: written, href: '/docs/written' },
    ]);
  });
});

describe('docsTopic', () => {
  it('finds the topic a slug names', () => {
    expect(docsTopic('ui-library').title).toBe('The UI library');
  });
});

describe('the docs topics', () => {
  it('gives every topic its own slug', () => {
    const slugs = DOCS_TOPICS.map((topic) => topic.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has a page route for every published topic and a published topic for every page route', () => {
    const published = DOCS_TOPICS.filter((topic) => topic.status === 'published')
      .map((topic) => topic.slug)
      .toSorted();

    expect(topicRoutes()).toEqual(published);
    for (const slug of published) {
      expect(existsSync(join(DOCS_ROUTES, slug, '+page.svelte'))).toBe(true);
    }
  });

  it('places each page under the docs root', () => {
    expect(docsTopicHref('security-headers')).toBe('/docs/security-headers');
  });
});
