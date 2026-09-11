/** Keeps asynchronous host snapshots from replacing newer local typing. */
export class EditorSync {
  revision = 0;
  private lastUpdateId = 0;

  edit(): number {
    return ++this.revision;
  }

  accept(revision: number, updateId: number): boolean {
    if (revision !== this.revision || updateId <= this.lastUpdateId) return false;
    this.lastUpdateId = updateId;
    return true;
  }
}

/** Keeps a caret anchored across a host update instead of moving it to the end. */
export function mapTextPosition(previous: string, next: string, position: number): number {
  const bounded = Math.max(0, Math.min(position, previous.length));
  let prefix = 0;
  const prefixLimit = Math.min(previous.length, next.length);
  while (prefix < prefixLimit && previous[prefix] === next[prefix]) prefix++;
  if (bounded <= prefix) return bounded;

  let suffix = 0;
  const suffixLimit = Math.min(previous.length - prefix, next.length - prefix);
  while (
    suffix < suffixLimit
    && previous[previous.length - suffix - 1] === next[next.length - suffix - 1]
  ) suffix++;

  const previousSuffixStart = previous.length - suffix;
  if (bounded >= previousSuffixStart) return next.length - (previous.length - bounded);

  return next.length - suffix;
}
