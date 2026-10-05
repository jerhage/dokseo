import { checkSnippets } from '../snippet-checks';
import * as quotes from './async-snippets';

checkSnippets('the async correctness page snippets', quotes.ASYNC_SNIPPETS, quotes);
