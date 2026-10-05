import { checkSnippets } from '../snippet-checks';
import * as quotes from './stored-format-snippets';

checkSnippets('the stored format snippets', quotes.STORED_FORMAT_SNIPPETS, quotes);
