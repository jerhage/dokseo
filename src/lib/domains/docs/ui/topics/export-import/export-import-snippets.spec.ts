import { checkSnippets } from '../snippet-checks';
import * as quotes from './export-import-snippets';

checkSnippets('the export and import page snippets', quotes.EXPORT_IMPORT_SNIPPETS, quotes);
