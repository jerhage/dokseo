import { checkSnippets } from '../snippet-checks';
import * as quotes from './release-snippets';

checkSnippets('the releases and CI page snippets', quotes.RELEASE_SNIPPETS, quotes);
