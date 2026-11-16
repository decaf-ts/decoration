import { Metadata } from "../../src";

/** What `Metadata.Symbol` computed before it was cached. */
const uncached = (obj: any) => Symbol.for([obj.toString(), obj.name].join(" - "));

describe("Metadata.Symbol cache", () => {
  it("returns exactly the uncached symbol, on every call", () => {
    class SymbolCacheA {}
    const first = Metadata.Symbol(SymbolCacheA);
    expect(first).toBe(uncached(SymbolCacheA));
    expect(Metadata.Symbol(SymbolCacheA)).toBe(first);
  });

  it("recomputes when the class is renamed", () => {
    class SymbolCacheB {}
    const before = Metadata.Symbol(SymbolCacheB);
    Object.defineProperty(SymbolCacheB, "name", { value: "SymbolCacheRenamed" });
    const after = Metadata.Symbol(SymbolCacheB);
    expect(after).not.toBe(before);
    expect(after).toBe(uncached(SymbolCacheB));
  });

  it("keeps distinct identities for classes with a stable static toString()", () => {
    let next = 0;
    const ids = new WeakMap<object, number>();
    class Base {
      static override toString(): string {
        if (!ids.has(this)) ids.set(this, next++);
        return `Base#${ids.get(this)}`;
      }
    }
    // Same source text and name: only the static toString() tells them apart.
    const make = () => class Same extends Base {};
    const One = make();
    const Two = make();
    expect(Metadata.Symbol(One)).toBe(uncached(One));
    expect(Metadata.Symbol(Two)).toBe(uncached(Two));
    expect(Metadata.Symbol(One)).not.toBe(Metadata.Symbol(Two));
  });

  it("shares the symbol of constructors with identical source and name (unchanged behaviour)", () => {
    const make = () => class Twin {};
    expect(Metadata.Symbol(make())).toBe(Metadata.Symbol(make()));
  });

  it("caches no metadata values: every set is visible to the next get", () => {
    class SymbolCacheC {}
    Metadata.set(SymbolCacheC, "custom.flag", 1);
    expect(Metadata.get(SymbolCacheC, "custom.flag")).toBe(1);
    Metadata.set(SymbolCacheC, "custom.flag", 2);
    expect(Metadata.get(SymbolCacheC, "custom.flag")).toBe(2);

    class SymbolCacheChild extends SymbolCacheC {}
    expect(Metadata.get(SymbolCacheChild, "custom.flag")).toBe(2);
    Metadata.set(SymbolCacheC, "custom.flag", 3);
    expect(Metadata.get(SymbolCacheChild, "custom.flag")).toBe(3);
  });

  it("does not cache non-function targets", () => {
    const target = { name: "plain", toString: () => "first" };
    expect(Metadata.Symbol(target as any)).toBe(uncached(target));
    target.toString = () => "second";
    expect(Metadata.Symbol(target as any)).toBe(uncached(target));
  });
});
