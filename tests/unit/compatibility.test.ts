import {
  Decoration,
  DecorationKeys,
  metadata,
  Metadata,
  uses,
} from "../../src/index";

describe("Multiple Decoration Compatibility", () => {
  it("Applies multiple decorations without conflict", () => {
    const f1 = jest.fn();
    const f2 = jest.fn();
    const f3 = jest.fn();

    function decorator(name: string, num: number) {
      function innerDecorator(name: string, num: number) {
        return function (
          target: any,
          propertyKey?: string | symbol,
          descriptor?: PropertyDescriptor
        ) {
          return f1(name, num, target, propertyKey, descriptor);
        };
      }

      return Decoration.for("TEST")
        .define({
          decorator: innerDecorator,
          args: [name, num],
        })
        .apply();
    }

    function decorator2(name: string, num: number) {
      return function (
        target: any,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor
      ) {
        return f2(name, num, target, propertyKey, descriptor);
      };
    }

    function decorator3(name: string, num: number) {
      return function (
        target: any,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor
      ) {
        return f3(name, num, target, propertyKey, descriptor);
      };
    }

    Decoration.flavouredAs("2")
      .for("TEST")
      .define({
        decorator: decorator2,
      } as any)
      .apply();

    Decoration.flavouredAs("3")
      .for("TEST")
      .define({
        decorator: decorator3,
      } as any)
      .apply();

    class Obj1 {
      @decorator("first", 1)
      prop!: string;
      constructor() {}
    }

    @uses("2")
    class Obj2 {
      @decorator("first", 2)
      prop!: string;
      constructor() {}
    }

    @uses("3")
    class Obj3 {
      @decorator("first", 3)
      prop!: string;
      constructor() {}
    }

    const meta1 = Metadata.get(Obj1, DecorationKeys.FLAVOUR);
    const meta2 = Metadata.get(Obj2, DecorationKeys.FLAVOUR);
    const meta3 = Metadata.get(Obj3, DecorationKeys.FLAVOUR);

    const obj1 = new Obj1();
    obj1.prop = "test1";
    const obj2 = new Obj2();
    obj2.prop = "test2";
    const obj3 = new Obj3();
    obj3.prop = "test3";

    expect(f1).toHaveBeenCalledWith("first", 1, {}, "prop", undefined);
    expect(f2).toHaveBeenCalledWith("first", 2, {}, "prop", undefined);
    expect(f3).toHaveBeenCalledWith("first", 3, {}, "prop", undefined);
  });
});
