/**
 * @file constants.ts
 * @description Shared constants and enums leveraged by the decoration package.
 * @summary Defines flavour fallbacks, key splitters, metadata keys, and default metadata structures consumed by builder and metadata utilities.
 */

import { BasicMetadata } from "./metadata/types";

/**
 * @description Default flavour identifier for the decorator system
 * @summary Defines the default flavour used by the Decoration class when no specific flavour is provided.
 * This constant is used throughout the library as the fallback flavour for decorators.
 * @const DefaultFlavour
 * @memberOf module:decoration
 */
export const DefaultFlavour = "decaf";

/**
 * @description Character used to split nested metadata keys
 * @summary The delimiter used by the metadata store to traverse nested object paths when reading/writing values.
 * @const ObjectKeySplitter
 * @memberOf module:decoration
 */
export const ObjectKeySplitter = ".";

/**
 * @description Enum containing metadata keys used for reflection in the model system
 * @summary Defines the various Model keys used for reflection and metadata storage.
 * These keys are used throughout the library to store and retrieve metadata about models,
 * their properties, and their behavior.
 * @readonly
 * @enum {string}
 * @readonly
 * @memberOf module:decoration
 */
export enum DecorationKeys {
  LIBRARIES = "libraries",
  /** Storage key used on the constructor to mirror runtime metadata */
  REFLECT = `__${DefaultFlavour}`,
  /** Map of model property keys to their reflected design types */
  PROPERTIES = "properties",
  /** Map of model method keys to their reflected design params and return types */
  METHODS = "methods",
  /** Key under which the model's constructor is stored */
  CLASS = "class",
  /** Container of human-friendly descriptions per class and property */
  DESCRIPTION = "description",
  /** Holds the original constructor - for constructor override**/
  CONSTRUCTOR = "constructor",
  /** Reflect metadata key for design time type of a property */
  DESIGN_TYPE = "design:type",
  /** Reflect metadata key for constructor parameter types */
  DESIGN_PARAMS = "design:paramtypes",
  /** Reflect metadata key for method return type */
  DESIGN_RETURN = "design:returntype",
}

/**
 * @description Typedef for the default metadata object shape
 * @summary Describes the minimal structure persisted for a model before any metadata is recorded.
 * @template M
 * @typedef {object} DefaultMetadataType<M>
 * @property {Record<string, Constructor | undefined>} properties - Mapping of property names to their design types
 * @memberOf module:decoration
 */

/**
 * @description Default metadata instance
 * @summary Concrete default metadata object used when initializing metadata for a model
 * @type {DefaultMetadataType<any>}
 * @const DefaultMetadata
 * @memberOf module:decoration
 */
export const DefaultMetadata: BasicMetadata<any> = {
  [DecorationKeys.PROPERTIES]: [],
} as unknown as BasicMetadata<any>;
