import { checkSnippets } from '../snippet-checks';
import * as quotes from './build-snippets';

checkSnippets('the production build page snippets', quotes.BUILD_SNIPPETS, quotes);
