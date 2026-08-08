const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Random token used by the Content Security Policy of every webview. */
export function nonce(): string {
  let result = '';
  for (let index = 0; index < 32; index++) {
    result += NONCE_ALPHABET.charAt(Math.floor(Math.random() * NONCE_ALPHABET.length));
  }

  return result;
}

/** Case-insensitive comparison used to keep notebooks and notes in a stable order. */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Counts words the way the editor status bar reports them. */
export function wordCount(text: string): number {
  const trimmed = text.trim();

  return trimmed ? trimmed.split(/\s+/u).length : 0;
}
