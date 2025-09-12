import { apply, Decoration } from "../../src";

export const Reporter = {
  f1: jest.fn(),
  f2: jest.fn(),
  f3: jest.fn(),
  f4: jest.fn(),
  f5: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function report(name: string, data: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function report(object: any, attr: any, descriptor: any) {
    Reporter[name]();
  }
  Object.defineProperty(report, "name", {
    value: name,
  });
  return report;
}

function f1() {
  return Decoration.for("f1").define(
    report("f1", {})).apply();
}

function f2() {
  return Decoration.for("f2").define(report("f2", {})).apply();
}

function f3() {
  return Decoration.for("f3").define(report("f3", {})).apply();
}

function f4() {
  return Decoration.for("f4").define(apply(f1(), f2())).apply();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function f5() {
  return Decoration.for("f5").define(apply(f3(), f4())).apply();
}

 
function f6() {
  return Decoration.for("f6").define({
    decorator: report,
    args: ["f6", {}],
  }).apply();
}

Decoration.flavouredAs("asdasd").for("f6").define({
  decorator: report2,
}).apply()

Decoration.setFlavourResolver(() => "asdasd");

class TTT {
  @f6()
  a: string = undefined;
  constructor() {
  }
}


Decoration.flavouredAs("assdfsdg").for("f6").extend({
  decorator: report2,
}).apply()


Decoration.setFlavourResolver(() => "assdfsdg");


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function f7() {
  return Decoration.for("f6").define({
    decorator: report2,
  }).apply();
}

 
function f7() {
  return Decoration.for("f6").extend({
    decorator: report2,
  }).apply();
}

const flavour = "flavour1";
Decoration.flavouredAs(flavour).for("f4").define(f1()).apply();

@f4("test")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ConstructionDecoration1 {
  constructor() {
  }
}

describe("dynamic class decoration - no override", () => {
  it("overrides decoration on the constructor", () => {
    expect(Reporter.f1).toHaveBeenCalledTimes(1);
    expect(Reporter.f2).toHaveBeenCalledTimes(1);
    expect(Reporter.f3).toHaveBeenCalledTimes(0);
    expect(Reporter.f4).toHaveBeenCalledTimes(0);
  });
});
