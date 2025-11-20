import "reflect-metadata";
import {
  Decoration,
  DecorationKeys,
  Metadata,
  description,
  metadata,
} from "../../src/index";

describe("description decorator - overridable and extensible", () => {
  it("Assigns a description", () => {
    @description("A simple class")
    class Described {
      @description("A simple property")
      prop!: string;

      constructor() {}
    }

    expect(Metadata.description(Described)).toEqual("A simple class");
    expect(Metadata.description(Described, "prop")).toEqual(
      "A simple property"
    );
  });

  function innerDescription(desc: string) {
    return function innerDescription(
      original: any,
      prop?: any,
      descriptor?: any
    ) {
      return metadata(
        Metadata.key(
          DecorationKeys.DESCRIPTION,
          prop ? prop.toString() : DecorationKeys.CLASS
        ),
        desc + "-override"
      )(original, prop, descriptor);
    };
  }

  it("is overridable", () => {
    Decoration.flavouredAs("X")
      .for(DecorationKeys.DESCRIPTION)
      .define({
        decorator: innerDescription,
      } as any)
      .apply();

    Decoration.setResolver(() => "X");

    @description("A simple class")
    class DescribedOverride {
      @description("A simple property")
      prop!: string;

      constructor() {}
    }

    expect(Metadata.description(DescribedOverride)).toEqual(
      "A simple class-override"
    );
    expect(Metadata.description(DescribedOverride, "prop")).toEqual(
      "A simple property-override"
    );
  });

  function innerDescriptionExtend(desc: string) {
    return function innerDescription(
      original: any,
      prop?: any,
      descriptor?: any
    ) {
      return metadata(
        Metadata.key("extend", prop ? prop.toString() : DecorationKeys.CLASS),
        desc + "-override"
      )(original, prop, descriptor);
    };
  }

  it("is extendable", () => {
    Decoration.flavouredAs("X")
      .for(DecorationKeys.DESCRIPTION)
      .extend({
        decorator: innerDescriptionExtend,
      } as any)
      .apply();

    @description("A simple class")
    class DescribedExtend {
      @description("A simple property")
      prop!: string;

      constructor() {}
    }

    const classDesc = Metadata.get(
      DescribedExtend,
      Metadata.key("extend", DecorationKeys.CLASS)
    );

    const propDesc = Metadata.get(
      DescribedExtend,
      Metadata.key("extend", "prop")
    );

    expect(Metadata.description(DescribedExtend)).toEqual(
      "A simple class-override"
    );
    expect(Metadata.description(DescribedExtend, "prop")).toEqual(
      "A simple property-override"
    );
    expect(classDesc).toEqual("A simple class-override");
    expect(propDesc).toEqual("A simple property-override");
  });
});
