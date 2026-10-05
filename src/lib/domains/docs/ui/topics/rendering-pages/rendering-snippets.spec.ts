import { checkSnippets } from '../snippet-checks';
import * as quotes from './rendering-snippets';

checkSnippets('the rendering pages snippets', quotes.RENDERING_SNIPPETS, quotes);
