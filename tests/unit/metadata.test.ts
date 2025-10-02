import "reflect-metadata";
import { Metadata } from "../../src";
import { DecorationKeys } from "../../src/constants";

describe("Metadata store", () => {
  const reset = () => {
    (Metadata as any).mirror = true;
    (Metadata as any)._metadata = {};
  };

  beforeEach(() => {
    reset();
  });

  afterEach(() => {
    reset();
  });

  it("should set and get nested values with mirroring on constructor", () => {
    class User {
      name!: string;
    }

    // Initially, no metadata
    expect(Metadata.get(User as any)).toBeUndefined();

    // Set nested values
    Metadata.set(User as any, `${DecorationKeys.DESCRIPTION}.class`, "A user");
    Metadata.set(User as any, `${DecorationKeys.PROPERTIES}.name`, String);

    // Read back via get and helpers
    expect(
      Metadata.get(User as any, `${DecorationKeys.DESCRIPTION}.class`)
    ).toBe("A user");
    expect(Metadata.description(User as any)).toBe("A user");
    expect(Metadata.type(User as any, "name")).toBe(String);

    // properties() yields keys
    expect(Metadata.properties(User as any)).toEqual(["name"]);

    // Mirrored on constructor under non-enumerable REFLECT key
    const desc = Object.getOwnPropertyDescriptor(User, DecorationKeys.REFLECT);
    expect(desc).toBeDefined();
    expect(desc?.enumerable).toBe(false);
    expect(desc?.configurable).toBe(false);
    expect(desc?.writable).toBe(false);
    expect((User as any)[DecorationKeys.REFLECT]).toBeDefined();
  });

  it("should not mirror when mirror flag is disabled", () => {
    class Book {}
    (Metadata as any).mirror = false;

    Metadata.set(Book as any, `${DecorationKeys.DESCRIPTION}.class`, "B");

    const desc = Object.getOwnPropertyDescriptor(Book, DecorationKeys.REFLECT);
    expect(desc).toBeUndefined();
  });

  it("should return undefined properties for classes without metadata", () => {
    class Empty {}
    expect(Metadata.properties(Empty as any)).toBeUndefined();
  });

  it("methods() should return undefined when no method metadata exists", () => {
    class NoMethods {}
    expect(Metadata.methods(NoMethods as any)).toBeUndefined();
  });

  it("methods() should list recorded method metadata keys", () => {
    class Service {
      get(): string {
        return "svc";
      }
    }

    Metadata.set(
      Service as any,
      `${DecorationKeys.METHODS}.get.${DecorationKeys.DESIGN_PARAMS}`,
      []
    );
    Metadata.set(
      Service as any,
      `${DecorationKeys.METHODS}.get.${DecorationKeys.DESIGN_RETURN}`,
      String
    );

    expect(Metadata.methods(Service as any)).toEqual(["get"]);
    expect(Metadata.params(Service as any, "get")).toEqual([]);
    expect(Metadata.return(Service as any, "get")).toBe(String);
  });
});
