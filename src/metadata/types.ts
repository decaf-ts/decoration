import { DecorationKeys } from "../constants";

/**
 * @description Core metadata shape stored for decorated models
 * @summary Defines the minimal structure persisted for each decorated constructor, including class descriptions, property type mappings, and method information used by the metadata utilities.
 * @template M
 * @typedef {object} BasicMetadata<M>
 * @property {Constructor<M>} [DecorationKeys.CLASS] Reference to the originating constructor
 * @property {Record<keyof M | `${DecorationKeys.CLASS}`, string>} [DecorationKeys.DESCRIPTION] Optional descriptions stored per class or property key
 * @property {Record<keyof M, Constructor<M> | undefined>} [DecorationKeys.PROPERTIES] Map of property names to their design-types
 * @property {Record<keyof M, Constructor<M> | undefined>} [DecorationKeys.METHODS] Map of method names to recorded metadata entries
 */
export type BasicMetadata<M> = {
  [DecorationKeys.CLASS]: Constructor<M>;
  [DecorationKeys.DESCRIPTION]?: Record<
    keyof M | `${DecorationKeys.CLASS}`,
    string
  >;
  [DecorationKeys.PROPERTIES]: Record<keyof M, Constructor<M> | undefined>;
  [DecorationKeys.METHODS]: Record<keyof M, Constructor<M> | undefined>;
};

/**
 * @description Constructor type for creating instances of a given object type
 * @summary Defines a generic constructor signature that can instantiate objects of type OBJ with any arguments.
 * @template OBJ
 * @typedef {Constructor<OBJ>} Constructor
 * @memberOf module:decoration
 */
export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
