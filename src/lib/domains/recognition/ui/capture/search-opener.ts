function openerOf<T>(focused: T | null, pressed: T | null, page: T): T | null {
  return focused !== null && focused !== page ? focused : pressed;
}

export { openerOf };
