import "reflect-metadata";
import { Metadata, getValueBySplitter, setValueBySplitter } from "../../src";
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

  it("getValueBySplitter should return undefined when any path segment is missing", () => {
    const data = { nested: { present: true } };

    expect(getValueBySplitter(data, "nested.absent.leaf")).toBeUndefined();
  });

  it("setValueBySplitter should ignore empty paths", () => {
    const data = { keep: "original" } as Record<string, unknown>;

    setValueBySplitter(data, "", "mutated");

    expect(data).toEqual({ keep: "original" });
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

  it("param() helper should throw when index is out of range", () => {
    class Service {}

    Metadata.set(
      Service as any,
      `${DecorationKeys.METHODS}.run.${DecorationKeys.DESIGN_PARAMS}`,
      [Number]
    );

    expect(() => Metadata.param(Service as any, "run", 3)).toThrow(
      /Parameter index 3 out of range/
    );
  });

  it("Metadata.param should return undefined when no parameter metadata exists", () => {
    class Service {}

    expect(Metadata.param(Service as any, "missing", 0)).toBeUndefined();
  });

  it("inner metadata helpers should handle symbol keys", () => {
    const bucket = Symbol("bucket");
    const key = Symbol("key");

    (Metadata as any)._metadata = {};

    (Metadata as any).innerSet(bucket, key, 42);
    expect((Metadata as any).innerGet(bucket, key)).toBe(42);
  });

  it("libraries() should expose registered library versions", () => {
    const lib = "@decaf-ts/coverage-lib";
    Metadata.registerLibrary(lib, "0.1.0");

    expect(Metadata.libraries()[lib]).toBe("0.1.0");
  });

  it("libraries() should return an empty object when nothing is registered", () => {
    expect(Metadata.libraries()).toEqual({});
  });
});
