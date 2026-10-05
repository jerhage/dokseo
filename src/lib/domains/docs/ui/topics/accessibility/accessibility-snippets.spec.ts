import { checkSnippets } from '../snippet-checks';
import * as quotes from './accessibility-snippets';

checkSnippets('the accessibility page snippets', quotes.ACCESSIBILITY_SNIPPETS, quotes);
