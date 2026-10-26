import { readdirSync, readFileSync } from 'node:fs';

type ContractExample = { readonly name: string; readonly value: unknown };

type SchemaKeys = { readonly required: readonly string[]; readonly properties: readonly string[] };

const CONTRACT = new URL('../../../../../contracts/dokseo-sync/', import.meta.url);

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, 'utf8'));
}

function contractExamples(outcome: 'valid' | 'invalid', kind: string): readonly ContractExample[] {
  const dir = new URL(`examples/${outcome}/${kind}-data/`, CONTRACT);
  return readdirSync(dir).map((name) => ({ name, value: readJson(new URL(name, dir)) }));
}

function contractExample(folder: string, name: string): unknown {
  return readJson(new URL(`examples/valid/${folder}/${name}.json`, CONTRACT));
}

function isNames(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((name) => typeof name === 'string');
}

function schemaKeys(kind: string): SchemaKeys {
  const schema = readJson(new URL(`schemas/${kind}-data.schema.json`, CONTRACT));
  if (typeof schema !== 'object' || schema === null) throw new Error(`no schema for ${kind}`);
  const required = 'required' in schema && isNames(schema.required) ? schema.required : [];
  const properties =
    'properties' in schema && typeof schema.properties === 'object' && schema.properties !== null
      ? Object.keys(schema.properties)
      : [];
  return { required, properties };
}

export { contractExample, contractExamples, schemaKeys };
export type { ContractExample, SchemaKeys };
