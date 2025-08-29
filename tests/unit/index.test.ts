import "reflect-metadata";
import * as pkg from "../../src";

describe("package index exports", () => {
  it("should export main APIs", () => {
    expect(typeof pkg.Decoration).toBe("function");
    expect(typeof pkg.Metadata).toBe("function");
    expect(typeof pkg.metadata).toBe("function");
    expect(typeof pkg.prop).toBe("function");
    expect(typeof pkg.apply).toBe("function");
    expect(typeof pkg.propMetadata).toBe("function");
    expect(typeof pkg.description).toBe("function");
    expect(pkg.DefaultFlavour).toBe("decaf");
  });
});
