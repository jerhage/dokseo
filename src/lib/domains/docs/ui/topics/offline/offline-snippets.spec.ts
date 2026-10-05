import { checkSnippets } from '../snippet-checks';
import * as quotes from './offline-snippets';

checkSnippets('the offline page snippets', quotes.OFFLINE_SNIPPETS, quotes);
