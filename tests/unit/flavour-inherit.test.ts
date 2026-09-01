import { DecorationKeys, Metadata, uses } from "../../src";

describe("Inherited flavour resolution", () => {
  it("resolves the ancestor's declared flavour for an undeclared leaf", () => {
    @uses("fabric")
    class DeclaredBase {}

    class UndeclaredLeaf extends DeclaredBase {}

    expect(
      (Metadata as any).innerGet(
        Metadata.Symbol(DeclaredBase as any),
        DecorationKeys.FLAVOUR
      )
    ).toBe("fabric");
    expect(
      (Metadata as any).innerGet(
        Metadata.Symbol(UndeclaredLeaf as any),
        DecorationKeys.FLAVOUR
      )
    ).toBeUndefined();
    expect(Metadata.flavourOf(UndeclaredLeaf as any)).toBe("fabric");
  });

  it("prefers the own flavour bucket over the ancestor chain", () => {
    @uses("fabric")
    class DeclaredBase {}

    @uses("custom")
    class OwnFlavourChild extends DeclaredBase {}

    expect(Metadata.flavourOf(OwnFlavourChild as any)).toBe("custom");
    expect(Metadata.flavourOf(DeclaredBase as any)).toBe("fabric");
  });

  it("resolves independent branches without cross-branch leakage", () => {
    @uses("alpha-branch")
    class BaseA {}

    @uses("beta-branch")
    class BaseB {}

    class LeafA extends BaseA {}
    class LeafB extends BaseB {}
    class LeafOfLeafA extends LeafA {}

    expect(Metadata.flavourOf(LeafA as any)).toBe("alpha-branch");
    expect(Metadata.flavourOf(LeafB as any)).toBe("beta-branch");
    expect(Metadata.flavourOf(LeafOfLeafA as any)).toBe("alpha-branch");
    expect(Metadata.flavourOf(BaseA as any)).not.toBe("beta-branch");
    expect(Metadata.flavourOf(BaseB as any)).not.toBe("alpha-branch");
  });
});
