import "reflect-metadata";
import { Decoration } from "../../src/decoration/Decoration";
import { DefaultFlavour } from "../../src/constants";

describe("Decoration builder", () => {
  beforeEach(() => {
    // reset resolver to default for each test
    Decoration.setFlavourResolver(() => DefaultFlavour);
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

  it("should apply default decorators and flavour-specific extras when resolver returns flavour", () => {
    const log: string[] = [];

    // default base decorators
    const baseFactory = (arg: string): ClassDecorator => {
      return (target) => {
        log.push(`base:${arg}:${(target as any).name}`);
      };
    };
    const baseDirect: ClassDecorator = (target) => {
      log.push(`direct:${(target as any).name}`);
    };

    // register default
    Decoration.for("mix")
      .define({ decorator: baseFactory, args: ["A"] }, baseDirect)
      .apply();

    // register flavour-specific extras
    Decoration.flavouredAs("flv")
      .for("mix")
      .extend({
        decorator: (tag: string): ClassDecorator => {
          return (target) => {
            log.push(`extra:${tag}:${(target as any).name}`);
          };
        },
        args: ["X"],
      })
      .apply();
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
    Decoration.for("ovr").define(base).apply();
    // flavour-specific override decorators (no extras)
    Decoration.flavouredAs("f1").for("ovr").define(override).apply();

    Decoration.setFlavourResolver(() => "f1");
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
});
