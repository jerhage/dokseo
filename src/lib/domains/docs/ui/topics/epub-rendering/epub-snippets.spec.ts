import { checkSnippets } from '../snippet-checks';
import * as quotes from './epub-snippets';

checkSnippets('the EPUB page snippets', quotes.EPUB_SNIPPETS, quotes);
