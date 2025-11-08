import "reflect-metadata";
import { Decoration } from "../../src/decoration/Decoration";
import { DefaultFlavour } from "../../src/constants";

describe("Decoration.define replacement", () => {
  const resetState = () => {
    Decoration["setFlavourResolver"](() => DefaultFlavour);
    (Decoration as any).decorators = {};
  };

  beforeEach(() => resetState());
  afterEach(() => resetState());

  it("should replace previously defined decorators when define is called again", () => {
    const calls: string[] = [];

    // register first and apply it to a class before replacement
    const first = Decoration.for("r")
      .define(((t: any) => {
        calls.push(`first:${t.name || t.constructor.name}`);
      }) as any)
      .apply();

    @first
    class A {}

    // now replace the registration
    const second = Decoration.for("r")
      .define(((t: any) => {
        calls.push(`second:${t.name || t.constructor.name}`);
      }) as any)
      .apply();

    @second
    class B {}

    expect(calls).toEqual([`first:${A.name}`, `second:${B.name}`]);
  });

  it("define should also clear previously registered extras when replacing", () => {
    const calls: string[] = [];

    // base and extra registered
    const base = Decoration.for("x")
      .define(((t: any) => {
        calls.push(`base:${t.name}`);
      }) as any)
      .apply();

    Decoration.for("x")
      .extend(((t: any) => {
        calls.push(`extra:${t.name}`);
      }) as any)
      .apply();

    // using the current registration (base + extra)
    @base
    class BeforeReplace {}

    // now replace base with define — extras should be cleared for subsequent uses
    Decoration.for("x")
      .define(((t: any) => {
        calls.push(`replaced:${t.name}`);
      }) as any)
      .apply();

    @base
    class AfterReplace {}

    expect(calls).toEqual([
      `base:${BeforeReplace.name}`,
      `extra:${BeforeReplace.name}`,
      `replaced:${AfterReplace.name}`,
      `extra:${AfterReplace.name}`,
    ]);
  });
});
