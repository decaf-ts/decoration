import "reflect-metadata";
import {
  metadata,
  prop,
  apply,
  propMetadata,
  description,
} from "../../src/decorators";
import { Metadata } from "../../src/metadata/Metadata";
import { DecorationKeys } from "../../src/constants";
import Constructor = jest.Constructor;

describe("decorators utilities", () => {
  it("metadata(key,value) should set value on class and property", () => {
    class A {}
    @(metadata("x", 1) as unknown as ClassDecorator)
    class B {}

    expect(Metadata.get(A as any, "x")).toBeUndefined();
    expect(Metadata.get(B as any, "x")).toBe(1);

    class C {
      @metadata("y", 2)
      foo!: string;
    }

    expect(Metadata.get(C as any, "y")).toBe(2);
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
      marks.push(`method:${String(key)}:${typeof desc}`);
    };

    @apply(dClass)
    class K {
      @apply(dProp)
      p!: number;

      @apply(dMethod)
      m() {}
    }

    expect(marks).toEqual([
      "class:K",
      "prop:p",
      expect.stringMatching(/^method:m:/),
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
    @(description("Class D") as unknown as ClassDecorator)
    class D {
      @description("prop d")
      a!: any;
    }
    expect(Metadata.description(D as any)).toBe("Class D");
    expect(Metadata.description(D as any, "a" as any)).toBe("prop d");

    // It stores as description.class and description.<prop>
    expect(Metadata.get(D as any, `${DecorationKeys.DESCRIPTION}.class`)).toBe(
      "Class D"
    );
    expect(Metadata.get(D as any, `${DecorationKeys.DESCRIPTION}.a`)).toBe(
      "prop d"
    );
  });
});
