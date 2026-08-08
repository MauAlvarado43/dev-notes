interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare const acquireVsCodeApi: () => VsCodeApi;

const api = acquireVsCodeApi();

/** Sends a typed message to the extension host. */
export function send<Message>(message: Message): void {
  api.postMessage(message);
}

/** Webview state survives the view being hidden and restored. */
export function readState<State>(): Partial<State> {
  return (api.getState() as Partial<State> | undefined) ?? {};
}

export function writeState<State>(state: State): void {
  api.setState(state);
}

export function onHostMessage<Message>(handler: (message: Message) => void): void {
  window.addEventListener('message', (event: MessageEvent<Message>) => handler(event.data));
}
