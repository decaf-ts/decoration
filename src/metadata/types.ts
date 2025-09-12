import { DecorationKeys } from "../constants";

/**
 * @description Basic metadata structure associated with a decorated model
 * @summary Describes the shape of the metadata stored by the system for a given model type, including the constructor,
 * optional human-readable descriptions per class or property, and a map of property design types.
 * @template M
 * @typedef {object} BasicMetadata<M>
 * @property {Constructor<M>} [DecorationKeys.CLASS] - Constructor function reference for the model
 * @property {Record<keyof M | `${DecorationKeys.CLASS}`, string>=} [DecorationKeys.DESCRIPTION] - Optional map of descriptions by property key and a special "class" key for class-level description
 * @property {Record<keyof M, Constructor<M> | undefined>} [DecorationKeys.PROPERTIES] - Map of property names to their design types (as constructors) or undefined when unavailable
 * @memberOf module:decoration
 */
export type BasicMetadata<M> = {
  [DecorationKeys.CLASS]: Constructor<M>;
  [DecorationKeys.DESCRIPTION]?: Record<
    keyof M | `${DecorationKeys.CLASS}`,
    string
  >;
  [DecorationKeys.PROPERTIES]: Record<keyof M, Constructor<M> | undefined>;
};

/**
 * @description Constructor type for creating instances of a given object type
 * @summary Defines a generic constructor signature that can instantiate objects of type OBJ with any arguments.
 * @template OBJ
 * @typedef {new (...args: any[]) => OBJ} Constructor
 * @memberOf module:decoration
 */
export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
