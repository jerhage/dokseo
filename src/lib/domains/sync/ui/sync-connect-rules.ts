type ConnectFields = {
  readonly serverUrl: string;
  readonly username: string;
  readonly password: string;
  readonly deviceName: string;
};

function connectReady(fields: ConnectFields): boolean {
  return (
    fields.serverUrl.trim().length > 0 &&
    fields.username.trim().length > 0 &&
    fields.password.length > 0 &&
    fields.deviceName.trim().length > 0
  );
}

export { connectReady };
export type { ConnectFields };
