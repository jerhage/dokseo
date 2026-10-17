const CALIBRE_ROOT = `<?xml version='1.0' encoding='utf-8'?>
<feed xmlns:dc="http://purl.org/dc/terms/" xmlns:opds="http://opds-spec.org/2010/catalog" xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Library</title>
  <id>urn:calibre:main</id>
  <updated>2026-09-01T10:00:00+00:00</updated>
  <link type="application/atom+xml;profile=opds-catalog" href="/opds" rel="start"/>
  <link title="Search" type="application/atom+xml" href="/opds/search/{searchTerms}?library_id=calibre" rel="search"/>
  <entry>
    <title>By Newest</title>
    <id>urn:uuid:newest</id>
    <updated>2026-09-01T10:00:00+00:00</updated>
    <link type="application/atom+xml;type=feed;profile=opds-catalog;kind=navigation" href="/opds/navcatalog/6f6c64657374?library_id=calibre"/>
    <content type="text">Books sorted by date added</content>
  </entry>
  <entry>
    <title>By Series</title>
    <id>urn:uuid:series</id>
    <updated>2026-09-01T10:00:00+00:00</updated>
    <link type="application/atom+xml;type=feed;profile=opds-catalog;kind=navigation" href="/opds/navcatalog/4e736572696573?library_id=calibre"/>
    <content type="text">Books by series</content>
  </entry>
  <entry>
    <title>No Link Here</title>
    <id>urn:uuid:nolink</id>
    <link type="text/html" href="/somewhere"/>
  </entry>
</feed>`;

const CALIBRE_SERIES = `<?xml version='1.0' encoding='utf-8'?>
<feed xmlns:dc="http://purl.org/dc/terms/" xmlns:opds="http://opds-spec.org/2010/catalog" xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Library: Series: 星の旅</title>
  <id>calibre-series:星の旅</id>
  <updated>2026-09-01T10:00:00+00:00</updated>
  <link rel="start" type="application/atom+xml;profile=opds-catalog" href="/opds"/>
  <link rel="next" title="Next" type="application/atom+xml;profile=opds-catalog" href="/opds/navcatalog/4e736572696573?library_id=calibre&amp;offset=30"/>
  <link rel="previous" title="Previous" type="application/atom+xml;profile=opds-catalog" href="/opds/navcatalog/4e736572696573?library_id=calibre&amp;offset=0"/>
  <link rel="first" title="First" type="application/atom+xml;profile=opds-catalog" href="/opds/navcatalog/4e736572696573?library_id=calibre"/>
  <link rel="last" title="Last" type="application/atom+xml;profile=opds-catalog" href="/opds/navcatalog/4e736572696573?library_id=calibre&amp;offset=60"/>
  <link title="Search" type="application/atom+xml" href="/opds/search/{searchTerms}?library_id=calibre" rel="search"/>
  <entry>
    <title>星の旅 2</title>
    <id>urn:uuid:11111111-2222-3333-4444-555555555555</id>
    <updated>2026-08-15T12:30:00+00:00</updated>
    <author><name>山田 太郎</name></author>
    <author><name>  </name></author>
    <dc:language>jpn</dc:language>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">SERIES: 星の旅 [2]<br/>The second   voyage
      begins.</div></content>
    <link rel="http://opds-spec.org/acquisition" type="application/epub+zip" href="/get/epub/720/calibre" length="1071903" mtime="2026-08-15T12:30:00+00:00"/>
    <link rel="http://opds-spec.org/cover" type="image/jpeg" href="/get/cover/720/calibre"/>
    <link rel="http://opds-spec.org/image" type="image/jpeg" href="/get/cover/720/calibre"/>
    <link rel="http://opds-spec.org/image/thumbnail" type="image/jpeg" href="/get/thumb/720/calibre"/>
  </entry>
  <entry>
    <title>Star Voyage 3</title>
    <id>urn:uuid:66666666-7777-8888-9999-000000000000</id>
    <updated>2026-08-16T08:00:00+00:00</updated>
    <author><name>Jane Roe</name></author>
    <dc:language>en</dc:language>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">SERIES: Star Voyage [3]<br/>Plain tale.</div></content>
    <link rel="http://opds-spec.org/acquisition" type="application/pdf" href="/get/pdf/721/calibre" length="12x" mtime="2026-08-16T08:00:00+00:00"/>
    <link rel="http://opds-spec.org/cover" type="image/jpeg" href="/get/cover/721/calibre"/>
  </entry>
</feed>`;

const SPEC_CONFORMING_NAVIGATION = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Shelf</title>
  <id>https://example.org/opds</id>
  <updated>2026-09-01T00:00:00Z</updated>
  <link rel="self" href="https://example.org/opds" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <entry>
    <title>Fiction</title>
    <id>https://example.org/opds/fiction</id>
    <updated>2026-09-01T00:00:00Z</updated>
    <summary>Novels and stories</summary>
    <link rel="subsection" href="https://example.org/opds/fiction" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  </entry>
</feed>`;

const SPEC_CONFORMING_ACQUISITION = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/">
  <title>Fiction</title>
  <id>https://example.org/opds/fiction</id>
  <updated>2026-09-01T00:00:00Z</updated>
  <entry>
    <title>The Lantern Maker</title>
    <id>https://example.org/book/42</id>
    <updated>2026-07-01T00:00:00Z</updated>
    <author><name>Ann Poe</name></author>
    <summary>A short summary.</summary>
    <link rel="http://opds-spec.org/image" href="https://example.org/covers/42.png" type="image/png"/>
    <link rel="http://opds-spec.org/acquisition/open-access" href="https://example.org/files/42.cbz" type="application/vnd.comicbook+zip" length="2048"/>
  </entry>
</feed>`;

const BUY_ONLY = `<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Shop</title>
  <entry>
    <title>Paid Book</title>
    <id>urn:uuid:paid</id>
    <updated>2026-01-01T00:00:00Z</updated>
    <link rel="http://opds-spec.org/acquisition/buy" href="/buy/1" type="application/epub+zip"/>
  </entry>
</feed>`;

const UNKNOWN_MEDIA_TYPE = `<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Odd</title>
  <entry>
    <title>Audio Book</title>
    <id>urn:uuid:audio</id>
    <updated>2026-01-01T00:00:00Z</updated>
    <link rel="http://opds-spec.org/acquisition" href="/get/mp3/1" type="audio/mpeg"/>
  </entry>
</feed>`;

const CALIBRE_WEB_ID = 'urn:uuid:2853dacf-ed79-42f5-8e8a-a7bb3d1ae6a2';

const CALIBRE_WEB_ROOT = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <icon>/books/static/favicon.ico</icon>
  <id>${CALIBRE_WEB_ID}</id>
  <updated>2026-10-17T16:25:30+00:00</updated>
  <link rel="self" href="/books/opds" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="start" title="Start" href="/books/opds"
        type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="search"
      href="/books/opds/osd"
      type="application/opensearchdescription+xml"/>
  <link type="application/atom+xml" rel="search" title="Search" href="/books/opds/search/{searchTerms}" />
  <title>Calibre-Web</title>
  <author>
    <name>Calibre-Web</name>
    <uri>https://github.com/janeczku/calibre-web</uri>
  </author>
  <entry>
    <title>Recently added Books</title>
    <link href="/books/opds/new" type="application/atom+xml;profile=opds-catalog"/>
    <id>/books/opds/new</id>
    <updated>2026-10-17T16:25:30+00:00</updated>
    <content type="text">The latest Books</content>
  </entry>
  <entry>
    <title>Series</title>
    <link href="/books/opds/series" type="application/atom+xml;profile=opds-catalog"/>
    <id>/books/opds/series</id>
    <updated>2026-10-17T16:25:30+00:00</updated>
    <content type="text">Books ordered by series</content>
  </entry>
</feed>`;

const CALIBRE_WEB_BOOKS = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/" xmlns:dcterms="http://purl.org/dc/terms/">
  <icon>/books/static/favicon.ico</icon>
  <id>${CALIBRE_WEB_ID}</id>
  <updated>2026-10-17T16:25:30+00:00</updated>
  <link rel="self"
        href="/books/opds/new?"
        type="application/atom+xml;profile=opds-catalog;type=feed;kind=navigation"/>
  <link rel="up"
        href="/books/opds"
        type="application/atom+xml;profile=opds-catalog;type=feed;kind=navigation"/>
  <link rel="next"
        title="Next"
        href="/books/opds/new?offset=60"
        type="application/atom+xml;profile=opds-catalog;type=feed;kind=navigation"/>
    <link rel="search"
      href="/books/opds/osd"
      type="application/opensearchdescription+xml"/>
  <link type="application/atom+xml" rel="search" title="Search" href="/books/opds/search/{searchTerms}" />
  <title>Calibre-Web</title>
  <author>
    <name>Calibre-Web</name>
    <uri>https://github.com/janeczku/calibre-web</uri>
  </author>
  <entry>
    <title>あのときの王子くん</title>
    <id>urn:uuid:f7f144c3-9aa4-4494-8b7a-e2b5d501c970</id>
    <updated>2025-03-22T14:46:22+00:00</updated>

      <author>
        <name>アントワーヌ・ド・サン＝テグジュペリ</name>
      </author>

    <published>101-01-01T00:00:00+00:00</published>

      <dcterms:language>jpn</dcterms:language>

    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">



    </div></content>

    <link rel="http://opds-spec.org/acquisition" href="/books/opds/download/135/zip/"
          length="48037" title="ZIP" mtime="2025-03-22T14:46:22+00:00" type="application/zip"/>

    <link rel="http://opds-spec.org/acquisition" href="/books/opds/download/135/epub/"
          length="208007" title="EPUB" mtime="2025-03-22T14:46:22+00:00" type="application/epub+zip"/>

  </entry>
  <entry>
    <title>오뇌의 무도</title>
    <id>urn:uuid:62d2a606-bec2-4dde-a600-478d5ba0f1aa</id>
    <updated>2026-10-16T21:32:01+00:00</updated>

      <author>
        <name>김억 (金億)</name>
      </author>

      <dcterms:language>kor</dcterms:language>

    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">

        <p>&lt;p&gt;오뇌의 무도 (1921년) — 한국 최초의 번역시집.&lt;br/&gt;두산백과&lt;/p&gt;</p>

    </div></content>

    <link type="image/jpeg" href="/books/opds/cover/1480" rel="http://opds-spec.org/image"/>
    <link type="image/jpeg" href="/books/opds/cover/1480" rel="http://opds-spec.org/image/thumbnail"/>

    <link rel="http://opds-spec.org/acquisition" href="/books/opds/download/1480/epub/"
          length="288955" title="EPUB" mtime="2026-10-16T21:32:01+00:00" type="application/epub+zip"/>

  </entry>
  <entry>
    <title>Comic Without A Media Type</title>
    <id>urn:uuid:5c0ffee0-0000-4000-8000-00000000cbz1</id>
    <updated>2026-10-01T09:00:00+00:00</updated>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"></div></content>

    <link rel="http://opds-spec.org/acquisition" href="/books/opds/download/42/cbz/"
          length="5120" title="CBZ" mtime="2026-10-01T09:00:00+00:00" type="application/octet-stream"/>

  </entry>
</feed>`;

const CALIBRE_WEB_FORMATS = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/" xmlns:dcterms="http://purl.org/dc/terms/">
  <id>${CALIBRE_WEB_ID}</id>
  <updated>2026-10-17T16:25:31+00:00</updated>
  <link rel="self"
        href="/books/opds/formats?"
        type="application/atom+xml;profile=opds-catalog;type=feed;kind=navigation"/>
  <link type="application/atom+xml" rel="search" title="Search" href="/books/opds/search/{searchTerms}" />
  <title>Calibre-Web</title>
  <author>
    <name>Calibre-Web</name>
    <uri>https://github.com/janeczku/calibre-web</uri>
  </author>

  <entry>

    <title>CBR</title>

    <id>/books/opds/formats/CBR</id>
    <link rel="subsection" type="application/atom+xml;profile=opds-catalog" href="/books/opds/formats/CBR"/>
  </entry>

  <entry>

    <title>EPUB</title>

    <id>/books/opds/formats/EPUB</id>
    <link rel="subsection" type="application/atom+xml;profile=opds-catalog" href="/books/opds/formats/EPUB"/>
  </entry>

</feed>`;

const HTML_PAGE = `<!DOCTYPE html><html><head><title>Login</title></head><body><p>Sign in</p></body></html>`;

const NON_FEED_ROOT = `<?xml version="1.0"?><rss version="2.0"><channel><title>News</title></channel></rss>`;

export {
  BUY_ONLY,
  CALIBRE_ROOT,
  CALIBRE_SERIES,
  CALIBRE_WEB_BOOKS,
  CALIBRE_WEB_FORMATS,
  CALIBRE_WEB_ID,
  CALIBRE_WEB_ROOT,
  HTML_PAGE,
  NON_FEED_ROOT,
  SPEC_CONFORMING_ACQUISITION,
  SPEC_CONFORMING_NAVIGATION,
  UNKNOWN_MEDIA_TYPE,
};
