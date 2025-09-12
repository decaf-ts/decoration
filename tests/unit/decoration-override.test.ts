import { Decoration, propMetadata } from "../../src";

export const Reporter = {
  f1: jest.fn(),
  f2: jest.fn(),
  f3: jest.fn(),
  f4: jest.fn(),
  f5: jest.fn(),
};

function report(name: string, data: any) {
  function report(object: any, attr: any, descriptor: any) {
    try {
      Reporter[name]();
    } catch (e: unknown) {
      console.log(e);
    }
    return propMetadata(name, data)(object, attr, descriptor);
  }
  Object.defineProperty(report, "name", {
    value: name,
  });
  return report;
}

function f1() {
  return Decoration.for("f1")
    .define({
      decorator: report,
      args: ["f1", {}],
    })
    .apply();
}

function f2() {
  return Decoration.for("f2").define(report("f2", {})).apply();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function f3() {
  return Decoration.for("f3").define(report("f3", {})).apply();
}

function f4() {
  return Decoration.for("f4").define(f1(), f2()).apply();
}

function f5() {
  return Decoration.for("f1")
    .define({
      decorator: report,
      args: ["f5", {}],
    })
    .apply();
}

const flavour = "flavour2";
Decoration.setFlavourResolver(() => {
  return flavour;
});
Decoration.flavouredAs(flavour).for("f4").define(f1()).apply();

@f4()
class ConstructionDecoration2 {
  constructor() {}
}

describe("dynamic class decoration - override", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("overrides decoration on the constructor", () => {
    expect(Reporter.f1).toHaveBeenCalledTimes(1);
    expect(Reporter.f2).toHaveBeenCalledTimes(0);
    expect(Reporter.f3).toHaveBeenCalledTimes(0);
    expect(Reporter.f4).toHaveBeenCalledTimes(0);
  });

  it("manages self arguments in decorator override", () => {
    class ArgOverrideTestMode {
      @f5()
      arg!: string;

      constructor() {}
    }

    expect(Reporter.f1).toHaveBeenCalledTimes(1);
    expect(Reporter.f2).toHaveBeenCalledTimes(0);
    expect(Reporter.f3).toHaveBeenCalledTimes(0);
    expect(Reporter.f4).toHaveBeenCalledTimes(0);
    expect(Reporter.f5).toHaveBeenCalledTimes(1);
  });
});
