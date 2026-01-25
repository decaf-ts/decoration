import { Decoration } from "./decoration/Decoration";
import { DecorationKeys } from "./constants";
import { Metadata } from "./metadata/Metadata";
import { assignFlavour } from "./decoration/flavourRegistry";
import { metadata } from "./shared/core";

export {
  metadata,
  metadataArray,
  param,
  paramMetadata,
  prop,
  method,
  apply,
  propMetadata,
  methodMetadata,
} from "./shared/core";

/**
 * @description Assigns a flavour to a target.
 * @summary Decorator factory that assigns a specific flavour to a class, enabling flavour-aware decorator selection.
 * @param {string} flavour Flavour identifier to assign.
 * @return {ClassDecorator} Decorator that assigns the flavour when applied.
 * @function uses
 * @category Decorators
 */
export function uses(flavour: string) {
  return (object: any) => {
    const constr = assignFlavour(object, flavour, Decoration.defaultFlavour);

    if (flavour !== Decoration.defaultFlavour) {
      Decoration["resolvePendingDecorators"](constr, flavour);
    } else {
      let resolved: string | undefined;
      try {
        resolved = Decoration["flavourResolver"]
          ? Decoration["flavourResolver"](constr)
          : undefined;
      } catch {
        resolved = undefined;
      }
      if (resolved && resolved !== Decoration.defaultFlavour) {
        Decoration["resolvePendingDecorators"](constr, resolved);
      } else {
        Decoration["markPending"](constr);
      }
    }
    return object;
  };
}

/**
 * @description Attaches a human-readable description to a class or member.
 * @summary Decorator factory that stores a textual description in the metadata store under the appropriate description key for a class or its property.
 * @param {string} desc Descriptive text to associate with the class or property.
 * @return {ClassDecorator|MethodDecorator|PropertyDecorator} Decorator that records the description when applied.
 * @function description
 * @category Decorators
 */
export function description(desc: string) {
  function innerDescription(desc: string) {
    return function innerDescription(
      original: any,
      prop?: any,
      descriptor?: any
    ) {
      return metadata(
        Metadata.key(
          DecorationKeys.DESCRIPTION,
          prop ? prop.toString() : DecorationKeys.CLASS
        ),
        desc
      )(original, prop, descriptor);
    };
  }

  return Decoration.for(DecorationKeys.DESCRIPTION)
    .define({
      decorator: innerDescription,
      args: [desc],
    })
    .apply();
}
