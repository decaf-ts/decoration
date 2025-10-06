import { BasicMetadata } from "./metadata/types";

/**
 * @description Default flavour identifier for the decorator system.
 * @summary Defines the default flavour used by the Decoration class when no specific flavour is provided. This constant is used throughout the library as the fallback flavour for decorators.
 * @const DefaultFlavour
 * @memberOf module:decoration
 */
export const DefaultFlavour = "decaf";

/**
 * @description Character used to split nested metadata keys.
 * @summary Defines the delimiter the metadata store uses to traverse nested object paths when reading or writing values.
 * @const ObjectKeySplitter
 * @memberOf module:decoration
 */
export const ObjectKeySplitter = ".";

/**
 * @description Metadata token registry for the decoration system.
 * @summary Enumerates the keys used during reflection and metadata storage for classes, properties, methods, descriptions, and registered libraries.
 * @enum {string}
 * @readonly
 * @const DecorationKeys
 * @memberOf module:decoration
 */
export enum DecorationKeys {
  /** @description Storage bucket for decoration-aware library registrations. */
  LIBRARIES = "libraries",
  /** @description Storage key mirrored on constructors that holds runtime metadata. */
  REFLECT = `__${DefaultFlavour}`,
  /** @description Container of reflected property metadata for a model. */
  PROPERTIES = "properties",
  /** @description Container of reflected method metadata for a model. */
  METHODS = "methods",
  /** @description Key under which the model constructor reference is persisted. */
  CLASS = "class",
  /** @description Human-readable descriptions for classes and members. */
  DESCRIPTION = "description",
  /** @description Storage slot tracking the original constructor when overridden. */
  CONSTRUCTOR = "constructor",
  /** @description Collected parameter metadata for configured decorators. */
  PARAMETERS = "parameters",
  /** @description Reflect metadata key for a property's design type. */
  DESIGN_TYPE = "design:type",
  /** @description Reflect metadata key for recorded constructor parameter types. */
  DESIGN_PARAMS = "design:paramtypes",
  /** @description Reflect metadata key for a method's return type. */
  DESIGN_RETURN = "design:returntype",
}

/**
 * @description Default metadata instance.
 * @summary Provides the default metadata shape used when initializing new metadata entries for a model.
 * @const DefaultMetadata
 * @memberOf module:decoration
 */
export const DefaultMetadata: BasicMetadata<any> = {
  [DecorationKeys.PROPERTIES]: [],
} as unknown as BasicMetadata<any>;
