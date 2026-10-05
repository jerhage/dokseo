import { checkSnippets } from '../snippet-checks';
import * as quotes from './identity-snippets';

checkSnippets('the book identity page snippets', quotes.IDENTITY_SNIPPETS, quotes);
