import { DecorationKeys } from "../constants";

/**
 * @description Shape of the metadata stored for a decorated model.
 * @summary Describes the required and optional metadata buckets tracked for a model, including constructor, descriptions, property types, and method signatures.
 * @template M
 * @typeDef {Object} module:decoration.BasicMetadata
 * @property {Constructor} class Canonical constructor associated with the metadata (`DecorationKeys.CLASS`).
 * @property {Object<string, string>} [description] Human-readable descriptions for the class and its members (`DecorationKeys.DESCRIPTION`).
 * @property {Object<string, Constructor|undefined>} properties Reflected property type constructors keyed by property name (`DecorationKeys.PROPERTIES`).
 * @property {Object<string, Constructor|undefined>} methods Reflected method signature constructors keyed by method name (`DecorationKeys.METHODS`).
 * @memberOf module:decoration
 */
/** @ignore */
export type BasicMetadata<M> = {
  /** @type {Constructor} */
  [DecorationKeys.CLASS]: Constructor<M>;
  /** @type {Object<string, string>} */
  [DecorationKeys.DESCRIPTION]?: Record<string, string>;
  /** @type {Object<string, Constructor|undefined>} */
  [DecorationKeys.PROPERTIES]: Record<string, Constructor<M> | undefined>;
  /** @type {Object<string, Constructor|undefined>} */
  [DecorationKeys.METHODS]: Record<string, Constructor<M> | undefined>;
};

/**
 * @description Constructor signature for instantiating type-safe objects.
 * @summary Represents a generic constructor function capable of creating instances of `OBJ` with arbitrary arguments.
 * @template OBJ
 * @typeDef Constructor
 * @memberOf module:decoration
 */
export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
