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
