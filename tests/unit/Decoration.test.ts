import "reflect-metadata";
import { Decoration } from "../../src/decoration/Decoration";
import { DefaultFlavour } from "../../src/constants";

describe("Decoration builder", () => {
  const resetState = () => {
    Decoration.setFlavourResolver(() => DefaultFlavour);
    (Decoration as any).decorators = {};
  };

  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    resetState();
  });

  it("should require key before define/extend", () => {
    const d = new Decoration();
    expect(() => (d as any).define(() => (t: any) => t)).toThrow(
      /key must be provided/i
    );
    expect(() => (d as any).extend(() => (t: any) => t)).toThrow(
      /key must be provided/i
    );
  });

  it("should forbid extending default flavour", () => {
    const d = new Decoration().for("k");
    expect(() => (d as any).extend(((target: any) => target) as any)).toThrow(
      /Default flavour cannot be extended/i
    );
  });

  it("should require overrides/addons when using non-default flavour with no decorators", () => {
    const d = new Decoration("x").for("k");
    expect(() => (d as any).define()).toThrow(
      /Must provide overrides or addons/i
    );
  });

  it("apply should register and return a named decorator function", () => {
    const dec = Decoration.for("named")
      .define(((t: any) => t) as any)
      .apply();
    expect(typeof dec).toBe("function");
    // default flavour name should be used
    expect((dec as any).name).toBe(`${DefaultFlavour}_decorator_for_named`);
  });

  it("should use override decorators when provided for a flavour", () => {
    const log: string[] = [];
    const base: ClassDecorator = (t) => {
      log.push(`base:${(t as any).name}`);
    };
    const override: ClassDecorator = (t) => {
      log.push(`override:${(t as any).name}`);
    };

    // default base
    const decorate = Decoration.for("ovr").define(base).apply();
    // flavour-specific override decorators (no extras)
    Decoration.flavouredAs("f1").for("ovr").define(override).apply();

    @decorate
    class DefaultDecorated {}

    Decoration.setFlavourResolver(() => "f1");

    @decorate
    class FlavouredDecorated {}

    expect(log).toEqual([
      `base:${DefaultDecorated.name}`,
      `override:${FlavouredDecorated.name}`,
    ]);
  });

  it("should throw for unexpected decorator type", () => {
    const dec = Decoration.for("err")
      .define(123 as any)
      .apply();
    expect(() => {
      @(dec as unknown as ClassDecorator)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Z {}
    }).toThrow(/Unexpected decorator type/);
  });

  it("should execute overridable decorator factories with preserved arguments", () => {
    const calls: string[] = [];

    const decorator = Decoration.for("factory")
      .define({
        decorator: (label: string, payload: { tag: string }) => {
          return ((target: any) => {
            calls.push(`${label}:${payload.tag}:${(target as any).name}`);
            return target;
          }) as ClassDecorator;
        },
        args: ["factory", { tag: "payload" }],
      } as any)
      .apply();

    @decorator
    class Decorated {}

    expect(calls).toEqual([`factory:payload:${Decorated.name}`]);
  });

  it("define should throw when multiple overridable decorators are provided", () => {
    const builder = Decoration.for("multi");
    const overridable = {
      decorator: (() => ((target: any) => target)) as any,
      args: [],
    };

    expect(() => builder.define(overridable as any, overridable as any)).toThrow(
      /only one is allowed/
    );
  });

  it("extend should throw when multiple overridable decorators are provided", () => {
    const base: ClassDecorator = (target) => target;
    const overridable = {
      decorator: (() => ((target: any) => target)) as any,
      args: [],
    };

    const builder = Decoration.flavouredAs("flavour")
      .for("multi-extend")
      .define(base);

    expect(() => builder.extend(overridable as any, overridable as any)).toThrow(
      /only one is allowed/
    );
  });

  it("register should enforce required arguments", () => {
    const register = (Decoration as any).register.bind(Decoration);
    expect(() => register("", "f", new Set())).toThrow(/No key provided/);
    expect(() => register("key", "f")).toThrow(/No decorators provided/);
    expect(() => register("key", "", new Set())).toThrow(/No flavour provided/);
  });
});
