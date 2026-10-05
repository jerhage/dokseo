import { checkSnippets } from '../snippet-checks';
import * as quotes from './vendored-snippets';

checkSnippets('the vendored UI library snippets', quotes.VENDORED_SNIPPETS, quotes);
