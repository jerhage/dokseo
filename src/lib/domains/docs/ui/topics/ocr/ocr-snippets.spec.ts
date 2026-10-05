import { checkSnippets } from '../snippet-checks';
import * as quotes from './ocr-snippets';

checkSnippets('the OCR page snippets', quotes.OCR_SNIPPETS, quotes);
