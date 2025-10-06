import "reflect-metadata";
import {
  metadata,
  prop,
  apply,
  propMetadata,
  description,
  param,
  paramMetadata,
  methodMetadata,
} from "../../src/decorators";
import { Metadata } from "../../src/metadata/Metadata";
import { DecorationKeys } from "../../src/constants";

describe("decorators utilities", () => {
  it("metadata(key,value) should set value on class and property", () => {
    class A {
      constructor() {}
    }
    @metadata("x", 1)
    class B {
      constructor() {}
    }

    expect(Metadata.get(A, "x")).toBeUndefined();
    expect(Metadata.get(B, "x")).toBe(1);

    class C {
      @metadata("y", 2)
      foo: string = undefined;
      constructor() {}
    }

    expect(Metadata.get(C, "y")).toBe(2);
  });

  it("prop() should record design type for property", () => {
    class T {
      @prop()
      title!: string;
    }
    expect(Metadata.type(T as any, "title")).toBe(String);
  });

  it("apply(...) should compose and apply class, property and method decorators", () => {
    const marks: string[] = [];
    const dClass: ClassDecorator = (target) => {
      marks.push(`class:${(target as any).name}`);
    };
    const dProp: PropertyDecorator = (_target, key) => {
      marks.push(`prop:${String(key)}`);
    };
    const dMethod: MethodDecorator = (_t, key, desc) => {
      marks.push(`method:${String(key)}:${typeof desc.value}`);
    };

    @apply(dClass)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class K {
      @apply(dProp)
      p!: number;

      @apply(dMethod)
      m() {
        console.log("m");
      }
    }

    expect(marks).toEqual([
      "prop:p",
      expect.stringMatching(/^method:m:function/),
      "class:K",
    ]);
  });

  it("propMetadata should both set metadata and record type", () => {
    class P {
      @propMetadata("k", "v")
      n!: number;
    }
    expect(Metadata.get(P as any, "k")).toBe("v");
    expect(Metadata.type(P as any, "n")).toBe(Number);
  });

  it("description should set class and property descriptions", () => {
    @description("Class D")
    @metadata("x", 1)
    class D {
      @description("prop d")
      a: any = undefined;
      constructor() {}
    }

    expect(Metadata.get(D as any, "x")).toBe(1);
    expect(Metadata.description(D as any)).toBe("Class D");

    // It stores as description.class and description.<prop>
    expect(Metadata.get(D as any, `${DecorationKeys.DESCRIPTION}.class`)).toBe(
      "Class D"
    );
    expect(Metadata.get(D as any, `${DecorationKeys.DESCRIPTION}.a`)).toBe(
      "prop d"
    );
  });

  it("param() should throw when parameter metadata is missing", () => {
    class NoMetadata {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handler(_arg: number) {}
    }

    const decorator = param();

    expect(() => decorator(NoMetadata.prototype, "handler", 0)).toThrow(
      /Missing parameter types/
    );
  });

  it("param() should throw when applied without a property key", () => {
    class NoPropertyKey {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      method(_arg: number) {}
    }

    const decorator = param();

    expect(() =>
      decorator(NoPropertyKey.prototype, undefined as any, 0)
    ).toThrow(/can only be applied to methods/);
  });

  it("param() should throw when index exceeds available metadata", () => {
    class WithMetadata {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handler(_arg: number) {}
    }

    const key = "handler";
    Reflect.defineMetadata(
      DecorationKeys.DESIGN_PARAMS,
      [Number],
      WithMetadata.prototype,
      key
    );

    const decorator = param();

    expect(() => decorator(WithMetadata.prototype, key, 2)).toThrow(
      /Parameter index 2 out of range/
    );
  });

  it("paramMetadata should append custom metadata alongside parameter types", () => {
    class Annotated {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      method(_value: number) {}
    }

    const key = "method";
    Reflect.defineMetadata(
      DecorationKeys.DESIGN_PARAMS,
      [Number],
      Annotated.prototype,
      key
    );

    const decorator = paramMetadata("tag", "value");
    decorator(Annotated.prototype, key, 0);

    expect(
      Metadata.get(Annotated, Metadata.key(DecorationKeys.METHODS, key, "tag"))
    ).toBe("value");
  });

  it("methodMetadata should store metadata and capture reflected types", () => {
    class WithMethodMetadata {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      method(_value: number): string {
        return "ok";
      }
    }

    const key = "method";
    Reflect.defineMetadata(
      DecorationKeys.DESIGN_PARAMS,
      [Number],
      WithMethodMetadata.prototype,
      key
    );
    Reflect.defineMetadata(
      DecorationKeys.DESIGN_RETURN,
      String,
      WithMethodMetadata.prototype,
      key
    );

    const decorator = methodMetadata("custom.method", "value");
    const descriptor = Object.getOwnPropertyDescriptor(
      WithMethodMetadata.prototype,
      key
    )!;

    decorator(WithMethodMetadata.prototype, key, descriptor);

    expect(Metadata.get(WithMethodMetadata, "custom.method")).toBe("value");
    expect(Metadata.params(WithMethodMetadata, key)).toEqual([Number]);
    expect(Metadata.return(WithMethodMetadata, key)).toBe(String);
  });
});
