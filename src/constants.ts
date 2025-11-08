import { BasicMetadata } from "./metadata/types";

/**
 * @description Default flavour identifier for the decorator system.
 * @summary Defines the fallback flavour used when no specific value is provided, ensuring consistent decorator selection across the library.
 * @type {string}
 * @const DefaultFlavour
 * @memberOf module:decoration
 */
export const DefaultFlavour = "decaf";

/**
 * @description Character used to split nested metadata keys.
 * @summary Defines the delimiter applied by the metadata store when traversing nested object paths for read and write operations.
 * @type {string}
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
  CONSTRUCTOR = "__original",
  /** @description Collected parameter metadata for configured decorators. */
  PARAMETERS = "parameters",
  /** @description identifies the decoration flavour. */
  FLAVOUR = "flavour",
  /** @description Reflect metadata key for a property's design type. */
  DESIGN_TYPE = "design:type",
  /** @description Reflect metadata key for recorded constructor parameter types. */
  DESIGN_PARAMS = "design:paramtypes",
  /** @description Reflect metadata key for a method's return type. */
  DESIGN_RETURN = "design:returntype",
}

/**
 * @description Default metadata instance.
 * @summary Provides the default metadata shape used when initialising new metadata entries for a model.
 * @type {module:decoration.BasicMetadata<any>}
 * @const DefaultMetadata
 * @memberOf module:decoration
 */
export const DefaultMetadata: BasicMetadata<any> = {
  [DecorationKeys.PROPERTIES]: [],
} as unknown as BasicMetadata<any>;
