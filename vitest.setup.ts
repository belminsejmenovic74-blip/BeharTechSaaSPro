// Polyfill localStorage en mémoire : le persist zustand des stores a besoin d'un
// storage fonctionnel, or jsdom n'en fournit pas toujours un utilisable sous vitest.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}
