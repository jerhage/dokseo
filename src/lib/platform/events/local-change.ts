const LOCAL_CHANGE_CHANNEL = 'dokseo-local-changes';

function channelAvailable(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

function announceLocalChange(): void {
  if (!channelAvailable()) return;
  const channel = new BroadcastChannel(LOCAL_CHANGE_CHANNEL);
  const post = channel.postMessage.bind(channel);
  post('changed');
  channel.close();
}

function watchLocalChanges(onChange: () => void): () => void {
  if (!channelAvailable()) return () => undefined;
  const channel = new BroadcastChannel(LOCAL_CHANGE_CHANNEL);
  channel.onmessage = () => onChange();
  return () => channel.close();
}

export { LOCAL_CHANGE_CHANNEL, announceLocalChange, watchLocalChanges };
