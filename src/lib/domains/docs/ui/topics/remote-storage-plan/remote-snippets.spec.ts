import { checkSnippets } from '../snippet-checks';
import * as quotes from './remote-snippets';

checkSnippets('the remote storage plan snippets', quotes.REMOTE_SNIPPETS, quotes);
