import { method, Metadata, param } from "../../src";

describe("decoration: methods", () => {
  it("Reads methods", () => {
    class MethodClass {
      constructor() {}

      @method()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      method(arg1: string): Promise<void> {
        return Promise.resolve();
      }
    }

    expect(Metadata.params(MethodClass, "method")).toEqual([String]);
    expect(Metadata.return(MethodClass, "method")).toBe(Promise);
  });

  it("Reads params", () => {
    class MethodClass2 {
      constructor() {}

      method(@param() arg1: string = ""): Promise<any> {
        return Promise.resolve(arg1);
      }
    }

    expect(Metadata.params(MethodClass2, "method")).toEqual([String]);
    expect(Metadata.return(MethodClass2, "method")).toBe(Promise);
    expect(Metadata.param(MethodClass2, "method", 0)).toBe(String);
  });
});
