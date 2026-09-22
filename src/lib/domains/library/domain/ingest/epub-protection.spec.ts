import { describe, expect, it } from 'vitest';
import { blocksReading, bookProtection } from './epub-protection';

const ORDINARY = ['META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/page1.xhtml'];

const OBFUSCATED_FONT = `<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"
            xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
  <enc:EncryptedData>
    <enc:EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/>
    <enc:CipherData>
      <enc:CipherReference URI="OEBPS/fonts/kokoro.otf"/>
    </enc:CipherData>
  </enc:EncryptedData>
</encryption>`;

const ADOBE_OBFUSCATED_FONT = `<encryption>
  <EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#">
    <CipherData><CipherReference URI="fonts/a.otf"/></CipherData>
    <EncryptionMethod Algorithm="http://ns.adobe.com/pdf/enc#RC4SHA1"/>
  </EncryptedData>
</encryption>`;

const DRM = `<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#">
    <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
    <CipherData><CipherReference URI="OEBPS/page1.xhtml"/></CipherData>
  </EncryptedData>
</encryption>`;

describe('bookProtection', () => {
  it('reports a book with neither file unprotected', () => {
    expect(bookProtection({ entryNames: ORDINARY, encryptionXml: null })).toEqual({
      kind: 'unprotected',
    });
  });

  it('reports a rights file as rights-managed without reading anything else', () => {
    const names = [...ORDINARY, 'META-INF/rights.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: null })).toEqual({
      kind: 'rights-managed',
    });
  });

  it('reports a rights file as rights-managed even beside obfuscated fonts', () => {
    const names = [...ORDINARY, 'META-INF/rights.xml', 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: OBFUSCATED_FONT })).toEqual({
      kind: 'rights-managed',
    });
  });

  it('tells the IDPF font obfuscation algorithm from encryption', () => {
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: OBFUSCATED_FONT })).toEqual({
      kind: 'obfuscated-fonts',
      algorithms: ['http://www.idpf.org/2008/embedding'],
    });
  });

  it("tells Adobe's font obfuscation algorithm from its DRM", () => {
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: ADOBE_OBFUSCATED_FONT })).toEqual({
      kind: 'obfuscated-fonts',
      algorithms: ['http://ns.adobe.com/pdf/enc#RC4SHA1'],
    });
  });

  it('reports an encrypted resource as encrypted, and names the algorithm', () => {
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: DRM })).toEqual({
      kind: 'encrypted',
      algorithms: ['http://www.w3.org/2001/04/xmlenc#aes128-cbc'],
    });
  });

  it('reports encryption when one entry is obfuscation and another is not', () => {
    const mixed = `<encryption>
      <EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData>
      <EncryptedData><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/></EncryptedData>
    </encryption>`;
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: mixed })).toEqual({
      kind: 'encrypted',
      algorithms: ['http://www.w3.org/2001/04/xmlenc#aes256-cbc'],
    });
  });

  it('names each algorithm once, however many resources use it', () => {
    const twice = `<encryption>
      <EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData>
      <EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData>
    </encryption>`;
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: twice })).toEqual({
      kind: 'obfuscated-fonts',
      algorithms: ['http://www.idpf.org/2008/embedding'],
    });
  });

  it('reports encryption it cannot read as encrypted, naming no algorithm', () => {
    const names = [...ORDINARY, 'META-INF/encryption.xml'];
    expect(bookProtection({ entryNames: names, encryptionXml: 'not xml' })).toEqual({
      kind: 'encrypted',
      algorithms: [],
    });
    expect(bookProtection({ entryNames: names, encryptionXml: null })).toEqual({
      kind: 'encrypted',
      algorithms: [],
    });
  });

  it('matches the two marker files whatever case the archive spells them in', () => {
    expect(bookProtection({ entryNames: ['meta-inf/rights.xml'], encryptionXml: null })).toEqual({
      kind: 'rights-managed',
    });
    expect(bookProtection({ entryNames: ['META-INF/Encryption.xml'], encryptionXml: DRM })).toEqual(
      { kind: 'encrypted', algorithms: ['http://www.w3.org/2001/04/xmlenc#aes128-cbc'] },
    );
  });
});

describe('blocksReading', () => {
  it('lets an unprotected book and one with obfuscated fonts through', () => {
    expect(blocksReading({ kind: 'unprotected' })).toBe(false);
    expect(blocksReading({ kind: 'obfuscated-fonts', algorithms: ['x'] })).toBe(false);
  });

  it('stops a rights-managed book and an encrypted one', () => {
    expect(blocksReading({ kind: 'rights-managed' })).toBe(true);
    expect(blocksReading({ kind: 'encrypted', algorithms: ['x'] })).toBe(true);
  });
});
