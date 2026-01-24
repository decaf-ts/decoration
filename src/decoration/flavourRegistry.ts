import { DecorationKeys } from "../constants";
import { Metadata } from "../metadata/Metadata";

const FLAVOUR_BUCKET_SYMBOL = Symbol.for(DecorationKeys.FLAVOUR);

/**
 * @description Updates the metadata registry to associate a constructor with the provided flavour.
 * @summary Removes the constructor from its previous flavour bucket, registers it under the new flavour, and mirrors the flavour value on the constructor.
 * @param {object} object Target object being decorated.
 * @param {string} flavour Flavour identifier to assign.
 * @param {string} defaultFlavour Fallback flavour used when no previous flavour is recorded.
 * @return {any} Canonical constructor associated with the target.
 * @function assignFlavour
 * @memberOf module:decoration
 */
export function assignFlavour(
  object: object,
  flavour: string,
  defaultFlavour: string
): any {
  const canonical = Metadata.constr(object as any);
  const previousFlavour =
    Metadata["innerGet"](
      Metadata.Symbol(object as any),
      DecorationKeys.FLAVOUR
    ) || defaultFlavour;
  const previousBucket =
    Metadata["innerGet"](FLAVOUR_BUCKET_SYMBOL, previousFlavour) || [];
  const filtered = previousBucket.filter((entry: any) => {
    return Metadata.constr(entry as any) !== canonical;
  });
  Metadata.set(DecorationKeys.FLAVOUR, previousFlavour, filtered);
  const nextBucket = new Set(
    Metadata["innerGet"](FLAVOUR_BUCKET_SYMBOL, flavour) || []
  );
  nextBucket.add(object);
  Metadata.set(DecorationKeys.FLAVOUR, flavour, [...nextBucket]);
  Metadata.set(canonical, DecorationKeys.FLAVOUR, flavour);
  return canonical;
}
