import { BasicMetadata } from "./metadata/types";

/**
 * @description Default flavour identifier for the decorator system
 * @summary Defines the default flavour used by the Decoration class when no specific flavour is provided.
 * This constant is used throughout the library as the fallback flavour for decorators.
 *
 * @const {string}
 * @memberOf module:decoration
 * @category Model
 */
export const DefaultFlavour = "decaf";

export const ObjectKeySplitter = ".";

/**
 * @description Enum containing metadata keys used for reflection in the model system
 * @summary Defines the various Model keys used for reflection and metadata storage.
 * These keys are used throughout the library to store and retrieve metadata about models,
 * their properties, and their behavior.
 * @readonly
 * @enum {string}
 * @memberOf module:decoration
 */
export enum DecorationKeys {
  REFLECT = `__${DefaultFlavour}`,
  PROPERTIES = "properties",
  CLASS = "class",
  DESCRIPTION = "description",
  DESIGN_TYPE = "design:type",
  DESIGN_PARAMS = "design:paramtypes",
  DESIGN_RETURN = "design:returntype",
}

export const DefaultMetadata: BasicMetadata<any> = {
  [DecorationKeys.PROPERTIES]: [],
} as unknown as BasicMetadata<any>;
