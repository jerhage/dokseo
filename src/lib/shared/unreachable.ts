function unreachable(value: never): never {
  throw new Error(`No branch handles ${JSON.stringify(value)}`);
}

export { unreachable };
