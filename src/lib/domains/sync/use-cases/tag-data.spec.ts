import { describe, expect, it } from 'vitest';
import { namedTag } from '$lib/domains/recognition/domain/tag/tag';
import { tagId } from '$lib/shared/ids';
import { contractExamples, schemaKeys } from './contract-examples';
import { fromSyncTagData, toSyncTagData } from './tag-data';

const ID = tagId('00000000-0000-4000-8000-000000000005');

describe('tag record data', () => {
  it('reads every valid contract example as a tag', () => {
    for (const { name, value } of contractExamples('valid', 'tag')) {
      expect(fromSyncTagData(value, ID).kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'tag')) {
      expect(fromSyncTagData(value, ID).kind, name).toBe('unreadable');
    }
  });

  it('writes the schema fields and reads the tag back unchanged', () => {
    const tag = namedTag(ID, 'grammar', 'sage', 1772445000000);
    const data = toSyncTagData(tag);
    const keys = schemaKeys('tag');
    expect(Object.keys(data).toSorted()).toEqual(keys.properties.toSorted());
    expect(fromSyncTagData(data, ID)).toEqual({ kind: 'success', tag });
  });
});
