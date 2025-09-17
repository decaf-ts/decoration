import { Decoration, propMetadata } from "../../src";

export const Reporter = {
  f1: jest.fn(),
  f2: jest.fn(),
};

export const Reporter2 = {
  f1: jest.fn(),
  f2: jest.fn(),
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

function report2(name: string, data: any) {
  function report2(object: any, attr: any, descriptor: any) {
    try {
      Reporter2[name]();
    } catch (e: unknown) {
      console.log(e);
    }
    return propMetadata(name, data)(object, attr, descriptor);
  }
  Object.defineProperty(report2, "name", {
    value: name,
  });
  return report2;
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
  return Decoration.for("f2")
    .define({
      decorator: report2,
      args: ["f2", {}],
    })
    .apply();
}

const flavour = "flavour2";

Decoration.setFlavourResolver(() => {
  return flavour;
});

Decoration.flavouredAs(flavour).for("f2").extend({ decorator: f1 }).apply();

describe("dynamic class decoration - extends with args", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("manages self arguments in decorator extends", () => {
    class ArgExtendsTestModel {
      @f2()
      arg!: string;

      constructor() {}
    }

    expect(Reporter.f1).toHaveBeenCalledTimes(1);
    expect(Reporter.f1).toHaveBeenCalledWith("f2", {});
    expect(Reporter.f2).toHaveBeenCalledTimes(0);
    expect(Reporter2.f1).toHaveBeenCalledTimes(0);
    expect(Reporter2.f2).toHaveBeenCalledTimes(1);
    expect(Reporter2.f2).toHaveBeenCalledWith("f2", {});
  });
});
