type CompilerFlag = '--strict' | '--noUncheckedIndexedAccess';

type CompiledExample = {
  readonly file: string;
  readonly flags: readonly CompilerFlag[];
  readonly code: string;
  readonly errors: string;
};

const STRICT: readonly CompilerFlag[] = ['--strict'];

const STRICT_INDEXED: readonly CompilerFlag[] = ['--strict', '--noUncheckedIndexedAccess'];

const NO_ERRORS = '';

export { NO_ERRORS, STRICT, STRICT_INDEXED };
export type { CompiledExample, CompilerFlag };
