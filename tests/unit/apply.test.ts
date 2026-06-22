import { apply } from "../../src";

describe("apply()", () => {
  it("threads a class decorator's replacement constructor through and returns it", () => {
    function wrap(): ClassDecorator {
      return ((original: any) => {
        const wrapped: any = function (...args: any[]) {
          return new original(...args);
        };
        wrapped.prototype = original.prototype;
        wrapped.marker = "wrapped";
        return wrapped;
      }) as ClassDecorator;
    }

    class Plain {}

    const decorator = apply(wrap());
    const replacement = decorator(Plain) as any;

    expect(replacement).toBeDefined();
    expect(replacement).not.toBe(Plain);
    expect(replacement.marker).toBe("wrapped");
  });

  it("chains multiple constructor-replacing class decorators in order", () => {
    function tag(name: string): ClassDecorator {
      return ((original: any) => {
        const wrapped: any = class extends original {};
        wrapped.tags = [...(original.tags || []), name];
        return wrapped;
      }) as ClassDecorator;
    }

    class Base {}

    const decorator = apply(tag("a"), tag("b"));
    const replacement = decorator(Base) as any;

    expect(replacement.tags).toEqual(["a", "b"]);
  });

  it("leaves the target untouched when composed decorators return void", () => {
    const calls: string[] = [];
    function sideEffectOnly(name: string): ClassDecorator {
      return (() => {
        calls.push(name);
      }) as ClassDecorator;
    }

    class Untouched {}

    const decorator = apply(sideEffectOnly("x"), sideEffectOnly("y"));
    const result = decorator(Untouched);

    expect(calls).toEqual(["x", "y"]);
    expect(result).toBe(Untouched);
  });

  it("threads a method decorator's replacement descriptor through and returns it", () => {
    function replaceWith(value: string): MethodDecorator {
      return (() => ({
        value,
        enumerable: false,
        configurable: true,
        writable: true,
      })) as unknown as MethodDecorator;
    }

    class HasMethod {
      original() {
        return "original";
      }
    }

    const initialDescriptor = Object.getOwnPropertyDescriptor(
      HasMethod.prototype,
      "original"
    ) as PropertyDescriptor;

    const decorator = apply(replaceWith("replaced"));
    const result = decorator(
      HasMethod.prototype,
      "original",
      initialDescriptor
    ) as PropertyDescriptor;

    expect(result.value).toBe("replaced");
  });
});
