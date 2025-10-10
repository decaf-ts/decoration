import { DecorationKeys } from "../constants";

/**
 * @description Shape of the metadata stored for a decorated model.
 * @summary Captures the constructor reference alongside optional description, property, and method metadata buckets maintained by the decoration runtime.
 * @template M
 * @typeDef BasicMetadata<M>
 * @property {Constructor<M>} [DecorationKeys.CLASS] Canonical constructor associated with the metadata entry.
 * @property {Record<string, string>} [DecorationKeys.DESCRIPTION] Human-readable descriptions for the class and its members.
 * @property {Record<string, Constructor<M>|undefined>} [DecorationKeys.PROPERTIES] Reflected property type constructors keyed by property name.
 * @property {Record<string, Constructor<M>|undefined>} [DecorationKeys.METHODS] Reflected method signature constructors keyed by method name.
 * @memberOf module:decoration
 */
/** @ignore */
export type BasicMetadata<M> = {
  /**
   * @description Canonical constructor associated with the metadata entry.
   * @type {Constructor<M>}
   */
  [DecorationKeys.CLASS]: Constructor<M>;
  /**
   * @description Map of human-friendly descriptions for the class and its members.
   * @type {Record<string, string>}
   */
  [DecorationKeys.DESCRIPTION]?: Record<string, string>;
  /**
   * @description Property metadata keyed by property name including recorded design types.
   * @type {Record<string, Constructor<M>|undefined>}
   */
  [DecorationKeys.PROPERTIES]: Record<string, Constructor<M> | undefined>;
  /**
   * @description Method metadata keyed by method name including recorded design signatures.
   * @type {Record<string, Constructor<M>|undefined>}
   */
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
