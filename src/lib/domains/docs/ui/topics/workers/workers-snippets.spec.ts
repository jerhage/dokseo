import { checkSnippets } from '../snippet-checks';
import * as quotes from './workers-snippets';

checkSnippets('the workers page snippets', quotes.WORKERS_SNIPPETS, quotes);
