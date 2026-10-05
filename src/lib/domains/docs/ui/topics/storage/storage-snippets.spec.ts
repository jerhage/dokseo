import { checkSnippets } from '../snippet-checks';
import * as quotes from './storage-snippets';

checkSnippets('the storage page snippets', quotes.STORAGE_SNIPPETS, quotes);
