import { Decoration, uses } from "../../src/index";

/**
 * A flavour's `.extend({ decorator })` receives the arguments of the
 * decorator CALL it extends (like `@index(["a"], ["b"])`), not those of
 * whichever call was declared last.
 */
describe("extend decorators receive the call's arguments", () => {
  const seen: { base: unknown[]; extra: unknown[] }[] = [];
  const KEY = "call-args-under-test";
  const FLAVOUR = "call-args-flavour";

  function decorated(...args: unknown[]) {
    return Decoration.for(KEY)
      .define({
        decorator: (...callArgs: unknown[]) => (target: any, prop: any) => {
          void target;
          seen.push({ base: [prop, ...callArgs], extra: [] });
        },
        args: args,
      } as any)
      .apply();
  }

  Decoration.flavouredAs(FLAVOUR)
    .for(KEY)
    .extend({
      decorator: (...callArgs: unknown[]) => (target: any, prop: any) => {
        void target;
        seen[seen.length - 1].extra = [prop, ...callArgs];
      },
    } as any)
    .apply();

  it("passes each call's own arguments to the extension", () => {
    @uses(FLAVOUR)
    class Subject {
      @decorated("first", ["x"])
      a!: string;

      @decorated("second", ["y"])
      b!: string;
    }
    void Subject;
    // Only the flavoured application (base + extension) is checked.
    expect(seen.filter((s) => s.extra.length)).toEqual([
      { base: ["a", "first", ["x"]], extra: ["a", "first", ["x"]] },
      { base: ["b", "second", ["y"]], extra: ["b", "second", ["y"]] },
    ]);
  });
});
