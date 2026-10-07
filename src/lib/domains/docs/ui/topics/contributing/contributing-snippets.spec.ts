import { checkSnippets } from '../snippet-checks';
import * as quotes from './contributing-snippets';

checkSnippets('the contributing page snippets', quotes.CONTRIBUTING_SNIPPETS, quotes);
