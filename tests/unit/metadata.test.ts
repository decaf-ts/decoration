import "reflect-metadata";
import { Metadata } from "../../src";
import { DecorationKeys } from "../../src/constants";

describe("Metadata store", () => {
  beforeEach(() => {
    // Reset mirror to default true for each test
    (Metadata as any).mirror = true;
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
    expect(Metadata.get(User as any, `${DecorationKeys.DESCRIPTION}.class`)).toBe(
      "A user",
    );
    expect(Metadata.description(User as any)).toBe("A user");
    expect(Metadata.type(User as any, "name")).toBe(String);

    // properties() yields keys
    expect(Metadata.properties(User as any)).toEqual(["name"]);

    // Mirrored on constructor under non-enumerable REFLECT key
    const desc = Object.getOwnPropertyDescriptor(
      User,
      DecorationKeys.REFLECT,
    );
    expect(desc).toBeDefined();
    expect(desc?.enumerable).toBe(false);
    expect(desc?.configurable).toBe(false);
    expect(desc?.writable).toBe(false);
    expect((User as any)[DecorationKeys.REFLECT]).toBeDefined();
  });

  it("should not mirror when mirror flag is disabled", () => {
    class Book {}
    ;(Metadata as any).mirror = false;

    Metadata.set(Book as any, `${DecorationKeys.DESCRIPTION}.class`, "B");

    const desc = Object.getOwnPropertyDescriptor(
      Book,
      DecorationKeys.REFLECT,
    );
    expect(desc).toBeUndefined();

    // cleanup
    (Metadata as any).mirror = true;
  });

  it("should return undefined properties for classes without metadata", () => {
    class Empty {}
    expect(Metadata.properties(Empty as any)).toBeUndefined();
  });
});
