const RULE_NOTES: Readonly<Record<string, string>> = {
  'no-circular': 'No module may import itself through a chain of other modules.',
  'only-the-container-builds-adapters':
    'Only container.ts and composition/ import an adapter, apart from an adapter reaching a sibling adapter in its own domain.',
  'domain-ring-is-pure':
    'A domain/ folder imports nothing from src/lib/domains except its own domain/ folder.',
  'queries-know-no-ui-or-wiring':
    'A queries/ folder imports no ui/, no adapters/, and none of container.ts, context.ts or composition/.',
  'queries-call-use-cases-they-are-handed':
    'A queries/ folder may name a use case’s types, but calls use cases through a parameter, never by importing them.',
  'only-ui-reads-queries': 'domain/, use-cases/ and adapters/ never import a queries/ folder.',
  'cross-domain-contract-only':
    'From another domain, only its domain/ and use-cases/ folders may be imported.',
  'leaf-domains-are-independent': 'A leaf domain imports no other domain at all.',
  'non-leaves-import-only-leaves': 'A non-leaf domain imports only its own folders and the leaves.',
  'the-base-layers-know-no-domain': 'shared/ and platform/ import no domain.',
  'routes-are-thin':
    'A route imports only container.ts, context.ts, query-client.ts, shared/, styles/, assets/, components/ and a domain’s ui/.',
  'base-components-know-no-app':
    'components/ imports only its siblings and assets/, nothing else under src/lib.',
  'icons-are-imported-one-by-one': 'Nothing imports an index module in components/icons/.',
  'only-the-pdf-adapter-loads-pdfjs': 'Only the PDF page source adapter imports pdfjs-dist.',
  'no-unresolvable':
    'Every import resolves to a file, apart from SvelteKit’s own $app, $env and $service-worker.',
};

function ruleNote(name: string): string {
  return RULE_NOTES[name] ?? name;
}

export { RULE_NOTES, ruleNote };
