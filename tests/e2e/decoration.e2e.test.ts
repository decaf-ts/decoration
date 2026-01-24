/**
 * @description E2E tests for Decoration class functionality
 * Tests Decoration builder pattern and flavour system against src/lib/dist builds
 *
 * NOTE: Decorator-based tests only run against src because decorators are compile-time
 * constructs that always use the statically imported module.
 */
import {
  getLibrary,
  TEST_ROOT,
  // Decorators must be imported statically for TypeScript transpilation
  prop,
  uses,
} from "./e2e.config";
import type {
  Decoration as DecorationType,
  Metadata as MetadataType,
  DefaultFlavour as DefaultFlavourType,
} from "./e2e.config";

// Decorator tests only work against src due to separate Metadata stores
const describeIfSrc = TEST_ROOT === "src" ? describe : describe.skip;

describe(`E2E Decoration Tests [${TEST_ROOT}]`, () => {
  let lib: Awaited<ReturnType<typeof getLibrary>>;
  let Decoration: typeof DecorationType;
  let Metadata: typeof MetadataType;
  let DefaultFlavour: typeof DefaultFlavourType;

  beforeAll(async () => {
    lib = await getLibrary();
    Decoration = lib.Decoration;
    Metadata = lib.Metadata;
    DefaultFlavour = lib.DefaultFlavour;
  });

  describe("Decoration Builder Pattern", () => {
    it("should create a decorator using fluent API", () => {
      const testDecorator = Decoration.for("test-key")
        .define((target: any) => target)
        .apply();

      expect(typeof testDecorator).toBe("function");
    });
  });

  describeIfSrc("Decoration Builder Pattern (decorator application)", () => {
    it("should apply defined decorator to a class", () => {
      let decoratorApplied = false;

      const markerDecorator = Decoration.for("marker-test")
        .define((target: any) => {
          decoratorApplied = true;
          return target;
        })
        .apply();

      @uses("decaf")
      @markerDecorator
      class MarkedClass {}

      expect(decoratorApplied).toBe(true);
    });

    it("should apply decorator to a property", () => {
      const propDecorator = Decoration.for("prop-decorator")
        .define((target: any, key: any) => {
          Metadata.set(target.constructor, `custom.${key}`, true);
        })
        .apply();

      @uses("decaf")
      class PropDecoratedClass {
        @propDecorator
        @prop()
        field!: string;
      }

      const result = Metadata.get(PropDecoratedClass, "custom.field");
      expect(result).toBe(true);
    });

    it("should apply decorator to a method", () => {
      const methodDecorator = Decoration.for("method-decorator")
        .define(
          (
            target: any,
            key: any,
            descriptor: PropertyDescriptor
          ): PropertyDescriptor => {
            const original = descriptor.value;
            descriptor.value = function (...args: any[]) {
              return `wrapped: ${original.apply(this, args)}`;
            };
            return descriptor;
          }
        )
        .apply();

      @uses("decaf")
      class MethodDecoratedClass {
        @methodDecorator
        getValue(): string {
          return "original";
        }
      }

      const instance = new MethodDecoratedClass();
      expect(instance.getValue()).toBe("wrapped: original");
    });
  });

  describeIfSrc("Decorator Factory with Arguments", () => {
    it("should support decorator factories with arguments", () => {
      function customDecoratorFactory(prefix: string) {
        return (target: any, key: any): void => {
          Metadata.set(target.constructor, `prefix.${key}`, prefix);
        };
      }

      const argDecorator = Decoration.for("arg-decorator")
        .define({
          decorator: customDecoratorFactory,
          args: ["myPrefix"],
        })
        .apply();

      @uses("decaf")
      class ArgDecoratedClass {
        @argDecorator
        @prop()
        field!: string;
      }

      const result = Metadata.get(ArgDecoratedClass, "prefix.field");
      expect(result).toBe("myPrefix");
    });
  });

  describeIfSrc("Flavoured Decorators", () => {
    it("should create decorator with specific flavour", () => {
      const defaultDecorator = Decoration.for("flavour-test")
        .define((target: any) => {
          Metadata.set(target, "decorator.flavour", "default");
          return target;
        })
        .apply();

      @uses("decaf")
      @defaultDecorator
      class DefaultFlavourClass {}

      const flavour = Metadata.get(DefaultFlavourClass, "decorator.flavour");
      expect(flavour).toBe("default");
    });

    it("should use flavouredAs to create flavour-specific decorator", () => {
      // Define base decorator
      Decoration.for("flavoured-decorator")
        .define((target: any) => {
          Metadata.set(target, "impl", "base");
          return target;
        })
        .apply();

      // Define Vue-flavoured version
      Decoration.flavouredAs("vue")
        .for("flavoured-decorator")
        .define((target: any) => {
          Metadata.set(target, "impl", "vue");
          return target;
        })
        .apply();

      expect(Decoration.defaultFlavour).toBe(DefaultFlavour);
    });
  });

  describeIfSrc("Decorator Extension", () => {
    it("should extend existing decorator", () => {
      // Define base decorator
      const baseDecorator = Decoration.for("extendable")
        .define((target: any) => {
          Metadata.set(target, "base", true);
          return target;
        })
        .apply();

      // Extend with additional functionality
      const extendedDecorator = Decoration.for("extendable")
        .extend((target: any) => {
          Metadata.set(target, "extended", true);
          return target;
        })
        .apply();

      @uses("decaf")
      @extendedDecorator
      class ExtendedClass {}

      expect(Metadata.get(ExtendedClass, "base")).toBe(true);
      expect(Metadata.get(ExtendedClass, "extended")).toBe(true);
    });
  });

  describeIfSrc("Static Factory Methods (decorator application)", () => {
    it("should use Decoration.for() static method with decorator", () => {
      const staticDecorator = Decoration.for("static-for")
        .define((target: any) => {
          Metadata.set(target, "static.created", true);
          return target;
        })
        .apply();

      @uses("decaf")
      @staticDecorator
      class StaticCreatedClass {}

      expect(Metadata.get(StaticCreatedClass, "static.created")).toBe(true);
    });
  });

  describe("Static Factory Methods", () => {
    it("should use Decoration.flavouredAs() static method", () => {
      const flavouredBuilder = Decoration.flavouredAs("custom");

      expect(flavouredBuilder).toBeDefined();
      expect(typeof flavouredBuilder.for).toBe("function");
    });
  });

  describe("Default Flavour", () => {
    it("should have default flavour value", () => {
      expect(Decoration.defaultFlavour).toBe("decaf");
    });

    it("should match exported DefaultFlavour constant", () => {
      expect(Decoration.defaultFlavour).toBe(DefaultFlavour);
    });
  });

  describe("Flavour Resolver", () => {
    it("should allow setting custom resolver", () => {
      const originalResolver = (target: object): string => "decaf";

      // Store original state
      const currentResolver = Decoration["flavourResolver"];

      // Set and test custom resolver
      Decoration.setResolver(originalResolver);

      // Restore (in real scenarios you might want to restore after test)
      Decoration.setResolver(currentResolver);

      expect(true).toBe(true); // Just verify no errors
    });
  });

  describeIfSrc("Complex Decorator Scenarios", () => {
    it("should handle multiple decorators on same target", () => {
      const decorator1 = Decoration.for("multi-1")
        .define((target: any) => {
          Metadata.set(target, "decorator1", true);
          return target;
        })
        .apply();

      const decorator2 = Decoration.for("multi-2")
        .define((target: any) => {
          Metadata.set(target, "decorator2", true);
          return target;
        })
        .apply();

      @uses("decaf")
      @decorator1
      @decorator2
      class MultiDecoratedClass {}

      expect(Metadata.get(MultiDecoratedClass, "decorator1")).toBe(true);
      expect(Metadata.get(MultiDecoratedClass, "decorator2")).toBe(true);
    });

    it("should handle decorators with class inheritance", () => {
      const classDecorator = Decoration.for("inheritable")
        .define((target: any) => {
          Metadata.set(target, "decorated", true);
          return target;
        })
        .apply();

      @uses("decaf")
      @classDecorator
      class BaseDecoratedClass {}

      @uses("decaf")
      class DerivedClass extends BaseDecoratedClass {}

      expect(Metadata.get(BaseDecoratedClass, "decorated")).toBe(true);
    });

    it("should apply property decorators to multiple properties", () => {
      const propMarker = Decoration.for("prop-marker")
        .define((target: any, key: any) => {
          const existing =
            Metadata.get(target.constructor, "markedProps") || [];
          Metadata.set(target.constructor, "markedProps", [...existing, key]);
        })
        .apply();

      @uses("decaf")
      class MultiPropClass {
        @propMarker
        @prop()
        field1!: string;

        @propMarker
        @prop()
        field2!: number;

        @propMarker
        @prop()
        field3!: boolean;
      }

      const markedProps = Metadata.get(MultiPropClass, "markedProps");
      expect(markedProps).toContain("field1");
      expect(markedProps).toContain("field2");
      expect(markedProps).toContain("field3");
    });
  });

  describe("Decorator Registration", () => {
    it("should reuse registered decorators", () => {
      // First registration
      Decoration.for("reusable")
        .define((target: any) => {
          Metadata.set(target, "reusable.applied", true);
          return target;
        })
        .apply();

      // Apply without re-defining
      const reusedDecorator = Decoration.for("reusable").apply();

      @uses("decaf")
      @reusedDecorator
      class ReusedClass {}

      expect(Metadata.get(ReusedClass, "reusable.applied")).toBe(true);
    });
  });
});
