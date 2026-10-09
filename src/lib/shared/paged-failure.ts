class PagedFailure<Failure> extends Error {
  override readonly name = 'PagedFailure';
  readonly failure: Failure;

  constructor(failure: Failure, message = 'The read failed.') {
    super(message);
    this.failure = failure;
  }
}

export { PagedFailure };
