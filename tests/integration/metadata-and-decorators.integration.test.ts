import "reflect-metadata";
import { Metadata } from "../../src/metadata";
import { description, method, prop } from "../../src/decorators";
import { Decoration } from "../../src/decoration";

// Integration tests exercising public API surface without mocks

describe("integration: metadata & decorators", () => {
  beforeEach(() => {
    // reset mirror to default true for each test
    (Metadata as any).mirror = true;
  });

  it("method() should capture design:paramtypes and design:returntype and be retrievable via Metadata.params/return", () => {
    class Svc {
      // apply the method decorator to record metadata
      @method()
      foo(a: number, b: string): boolean {
        return !!a && !!b;
      }
    }

    // Trigger decoration by touching the method (not necessary but explicit)
    const s = new Svc();
    s.foo(1, "x");

    // Verify params and return metadata
    expect(Metadata.params(Svc, "foo")).toEqual([Number, String]);
    expect(Metadata.return(Svc, "foo")).toBe(Boolean);
  });

  it("properties() should list recorded property keys when metadata exists", () => {
    class Model {
      @prop()
      name!: string;

      @prop()
      age!: number;
    }

    // Access to ensure decorators run
    const m = new Model();
    m.name = "A";
    m.age = 1;

    const props = Metadata.properties(Model);
    expect(props).toBeDefined();
    // the order is not guaranteed; compare as sets
    expect(new Set(props)).toEqual(new Set(["name", "age"]));
  });

  it("description() should return class and property descriptions", () => {
    @description("A described class")
    class D {
      @description("A described prop")
      prop!: number;
    }

    expect(Metadata.description(D)).toBe("A described class");
    expect(Metadata.description(D, "prop")).toBe("A described prop");
  });

  it("getValueBySplitter undefined path is returned when nested key is missing (via Metadata.get)", () => {
    class A {}

    // Set a value on a different nested path so the root metadata exists
    Metadata.set(A, ["a", "b"].join("."), 1);

    // Now query a sibling path that does not exist -> should be undefined from getValueBySplitter early return
    expect(Metadata.get(A, ["a", "x"].join("."))).toBeUndefined();
  });

  it("set() mirrors metadata on constructor under non-enumerable baseKey when mirror=true and not previously present", () => {
    class M {}

    // Ensure starting state has no mirror on constructor
    expect(Object.prototype.hasOwnProperty.call(M, Metadata.baseKey)).toBe(
      false
    );

    Metadata.set(M, ["x", "y"].join("."), 42);

    // Should have non-enumerable property defined on constructor
    const has = Object.prototype.hasOwnProperty.call(M, Metadata.baseKey);
    expect(has).toBe(true);
    const desc = Object.getOwnPropertyDescriptor(M, Metadata.baseKey as any);
    expect(desc?.enumerable).toBe(false);
    expect(desc?.configurable).toBe(false);
    expect(desc?.writable).toBe(false);

    // And the mirrored object should match internal storage via public get
    const mirrored: any = (M as any)[Metadata.baseKey];
    expect(mirrored).toEqual(Metadata.get(M));

    // Also confirms baseKey value path aligns with what we set
    expect(Metadata.get(M, "x.y")).toBe(42);
  });
});

describe("integration: decoration builder end-to-end", () => {
  it("applies default base decorators and flavoured extras resolved at application time", () => {
    const applied: Array<string> = [];

    const baseClassDeco: ClassDecorator = () => {
      applied.push("base-class");
    };
    const basePropDeco: PropertyDecorator = (_t: any, key: string | symbol) => {
      applied.push(`base-prop:${String(key)}`);
    };
    const extraMethodDeco: MethodDecorator = (
      _t: any,
      key: string | symbol
    ) => {
      applied.push(`extra-method:${String(key)}`);
    };

    // 1) Register default base decorators for key 'thing'
    const defaultBuilder = new Decoration()
      .for("thing")
      .define(baseClassDeco, basePropDeco);
    const deco = defaultBuilder.apply();

    // 2) Register extras for the same key but under a non-default flavour (vue)
    Decoration.flavouredAs("vue").for("thing").extend(extraMethodDeco).apply();

    // 3) Ensure we resolve flavour to 'vue' at application time so extras are picked
    Decoration["flavourResolver"] = () => "vue";

    @deco
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class X {
      @deco
      p!: number;

      @deco
      m(): void {}
    }

    // Verify that expected decorators were applied (ordering differs by invocation semantics)
    expect(applied).toEqual(
      expect.arrayContaining(["base-class", "base-prop:p", "extra-method:m"])
    );
  });

  it("apply() throws when no key was provided", () => {
    const builder = new Decoration();
    expect(() => builder.apply()).toThrow(
      "No key provided for the decoration builder"
    );
  });

  it("register() throws when decorators or flavour are missing", () => {
    const callRegister = () =>
      (Decoration as any).register("k", "", undefined, undefined);
    expect(callRegister).toThrow(
      "No decorators provided for the decoration builder"
    );

    // now provide empty set but missing flavour should still throw
    const callRegister2 = () =>
      (Decoration as any).register("k", "" as any, new Set(), undefined);
    expect(callRegister2).toThrow(
      "No flavour provided for the decoration builder"
    );
  });
});

describe("integration: library registration", () => {
  it("registerLibrary should throw on duplicate registration", () => {
    const key = "@decaf-ts/test-lib";
    Metadata.registerLibrary(key, "1.0.0");
    expect(() => Metadata.registerLibrary(key, "1.0.1")).toThrow(
      /already .* registered/i
    );
  });
});
