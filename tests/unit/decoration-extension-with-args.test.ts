import { Decoration, propMetadata } from "../../src/index";

export const Reporter = {
  f1: jest.fn(),
  f2: jest.fn(),
  f3: jest.fn(),
};

export const Reporter2 = {
  f1: jest.fn(),
  f2: jest.fn(),
};

export const Reporter3 = {
  f1: jest.fn(),
  f2: jest.fn(),
  f3: jest.fn(),
};

function report(name: string, data: any) {
  function report(object: any, attr: any, descriptor: any) {
    try {
      Reporter[name](name, data);
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
      Reporter2[name](name, data);
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

function report3(name: string, data: any) {
  function report3(object: any, attr: any, descriptor: any) {
    try {
      Reporter3[name](name, data);
    } catch (e: unknown) {
      console.log(e);
    }
    return propMetadata(name, data)(object, attr, descriptor);
  }
  Object.defineProperty(report3, "name", {
    value: name,
  });
  return report3;
}

function f1(str: string, obj: object) {
  return Decoration.for("f1")
    .define({
      decorator: report,
      args: [str, obj],
    })
    .apply();
}

function f2(str: string, obj: object) {
  return Decoration.for("f2")
    .define({
      decorator: report2,
      args: [str, obj],
    })
    .apply();
}

const flavour = "flavour2";

Decoration["setFlavourResolver"](() => {
  return flavour;
});

Decoration.flavouredAs(flavour).for("f2").extend({ decorator: f1 }).apply();

describe("dynamic class decoration - extends with args", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("manages self arguments in decorator extends", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ArgExtendsTestModel {
      @f2("f2", {})
      arg!: string;

      constructor() {}
    }

    expect(Reporter.f2).toHaveBeenCalledTimes(1);
    expect(Reporter.f2).toHaveBeenCalledWith("f2", {});
    expect(Reporter.f1).toHaveBeenCalledTimes(0);
    expect(Reporter2.f1).toHaveBeenCalledTimes(0);
    expect(Reporter2.f2).toHaveBeenCalledTimes(1);
    expect(Reporter2.f2).toHaveBeenCalledWith("f2", {});
  });

  it("extends the default flavour", () => {
    Decoration.for("f1")
      .extend({
        decorator: report3,
      })
      .apply();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ArgExtendsTestModel {
      @f1("f3", {})
      arg!: string;

      constructor() {}
    }

    expect(Reporter.f3).toHaveBeenCalledTimes(1);
    expect(Reporter3.f3).toHaveBeenCalledTimes(1);
    expect(Reporter.f3).toHaveBeenCalledWith("f3", {});
    expect(Reporter3.f3).toHaveBeenCalledWith("f3", {});
  });
});
