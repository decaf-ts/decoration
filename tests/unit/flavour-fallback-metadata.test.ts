import { Decoration, Metadata, metadata, uses } from "../../src";

describe("Decoration flavour fallback", () => {
  it("falls back to default decorators when flavour has no overrides", () => {
    const originalResolver = (Decoration as any).flavourResolver;
    try {
      Decoration.setResolver(() => "fabric");

      const Mark = () =>
        Decoration.for("mark").define((target: any, prop?: any) => {
          if (typeof prop === "undefined") return;
          return metadata(Metadata.key("mark", prop), true)(target, prop);
        }).apply();

      @uses("fabric")
      class Example {
        @Mark()
        field!: string;
      }

      const props = Metadata.properties(Example);
      expect(props).toContain("field");
      expect(Metadata.get(Example, Metadata.key("mark", "field"))).toBe(true);
    } finally {
      Decoration.setResolver(originalResolver);
    }
  });

  it("falls back to default class decorators when flavour has no overrides", () => {
    const originalResolver = (Decoration as any).flavourResolver;
    try {
      Decoration.setResolver(() => "fabric");

      const Marker = () =>
        Decoration.for("class-marker").define((target: any) => {
          const marked = class extends (target as any) {};
          Object.defineProperty(marked, "isMarked", {
            value: true,
            enumerable: false,
            configurable: false,
            writable: false,
          });
          return marked;
        }).apply();

      @uses("fabric")
      @Marker()
      class Example {}

      expect((Example as any).isMarked).toBe(true);
    } finally {
      Decoration.setResolver(originalResolver);
    }
  });

  it("falls back to default overridable decorators with args", () => {
    const originalResolver = (Decoration as any).flavourResolver;
    try {
      Decoration.setResolver(() => "fabric");

      const WithArg = (value: string) =>
        Decoration.for("with-arg")
          .define({
            decorator: (arg: string) => (target: any, prop?: any) => {
              if (typeof prop === "undefined") return;
              return metadata(Metadata.key("with-arg", prop), arg)(
                target,
                prop
              );
            },
            args: [value],
          })
          .apply();

      @uses("fabric")
      class Example {
        @WithArg("default")
        field!: string;
      }

      expect(
        Metadata.get(Example, Metadata.key("with-arg", "field"))
      ).toBe("default");
    } finally {
      Decoration.setResolver(originalResolver);
    }
  });
});
